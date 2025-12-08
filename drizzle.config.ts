import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  migrations: {
    prefix: 'timestamp', // Generates timestamp-based migration names like Supabase
  },
} satisfies Config;
