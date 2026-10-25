import {defineConfig} from 'prisma/config';
import {mockMigrationAwareAdapterFactory} from '@prisma/driver-adapter-utils';
// WASM schema tooling for client generation only.
// Database migrations are applied by scripts/migrate.ts with a checksum ledger.
export default defineConfig({schema:'prisma/schema.prisma',experimental:{adapter:true},engine:'js',adapter:async()=>mockMigrationAwareAdapterFactory('mysql')});
