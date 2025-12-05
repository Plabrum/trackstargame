/**
 * Drizzle ORM client for server-side database operations.
 *
 * This client provides type-safe database access and replaces Postgres RPC functions
 * with TypeScript-based mutations for better testability and performance.
 *
 * IMPORTANT: This is server-side only. Do NOT import in client components.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please add it to your .env.local file.\n' +
    'For local development: postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  );
}

// Create postgres client
// Note: For production with connection pooling, configure max connections here
const queryClient = postgres(DATABASE_URL, {
  // Prepare statements for better performance
  prepare: false,
  // Max connections (adjust based on deployment platform)
  max: 10,
});

// Create Drizzle instance
export const db = drizzle(queryClient);

// Export type for use in transaction functions
export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
