import { defineConfig } from 'prisma/config';

// Connection URLs live here for Prisma Migrate/CLI (Prisma 7 removed the
// datasource `url` from schema files). The URL itself comes from the
// environment (apps/api/.env.local via the db:* scripts, or CI secrets) —
// never hard-code it here. It is left empty when unset so commands that
// do not need a database (for example `prisma generate`) still run.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
