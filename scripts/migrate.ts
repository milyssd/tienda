import {createConnection} from 'mariadb';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
// Apply only checked-in, trusted SQL files. No request data reaches this runner.
const connection=await createConnection(process.env.DATABASE_URL!.replace(/^mysql:/,'mariadb:'));
try{
 await connection.query('CREATE TABLE IF NOT EXISTS `_prisma_migrations` (`id` VARCHAR(36) PRIMARY KEY, `checksum` VARCHAR(64) NOT NULL, `finished_at` DATETIME(3), `migration_name` VARCHAR(255) NOT NULL, `logs` TEXT, `rolled_back_at` DATETIME(3), `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0)');
 const locked=await connection.query("SELECT GET_LOCK('nexo_migrations',30) AS acquired");if(locked[0].acquired!==1)throw new Error('Migration lock unavailable');
 for(const name of (await readdir('prisma/migrations')).filter(n=>/^\d/.test(n)).sort()){
  const sql=await readFile(`prisma/migrations/${name}/migration.sql`,'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
  const rows=await connection.query('SELECT checksum,finished_at FROM `_prisma_migrations` WHERE migration_name=? AND rolled_back_at IS NULL',[name]);
  if(rows.length){if(rows[0].checksum!==checksum||!rows[0].finished_at)throw new Error('Migration changed or incomplete: '+name);continue;}
  const id=randomUUID();await connection.query('INSERT INTO `_prisma_migrations` (id,checksum,migration_name) VALUES (?,?,?)',[id,checksum,name]);
  for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await connection.query(statement);
  await connection.query('UPDATE `_prisma_migrations` SET finished_at=NOW(3),applied_steps_count=1 WHERE id=?',[id]);console.log('Applied '+name);
 }
}finally{await connection.query("SELECT RELEASE_LOCK('nexo_migrations')").catch(()=>{});await connection.end();}
