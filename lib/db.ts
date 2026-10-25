import {PrismaClient} from '@prisma/client';
import {PrismaMariaDb} from '@prisma/adapter-mariadb';
const globalDb=globalThis as unknown as {db:PrismaClient};
let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (client) return client;
  if (globalDb.db) return client = globalDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Configura DATABASE_URL antes de iniciar la tienda.');
  client = new PrismaClient({adapter: new PrismaMariaDb(url.replace(/^mysql:/, 'mariadb:'))});
  if (process.env.NODE_ENV !== 'production') globalDb.db = client;
  return client;
}

// Next imports route modules while compiling. Open the database only when an
// actual request or server task uses it; builds must not require credentials.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
