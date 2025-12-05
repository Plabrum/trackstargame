/**
 * Transaction utilities and helpers for database operations.
 *
 * Provides retry logic, transaction wrappers, and common transaction patterns.
 */

import type { Transaction } from '../client';

/**
 * Retry configuration for database operations
 */
export interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delayMs: 100,
  shouldRetry: (error: unknown) => {
    // Retry on serialization failures and deadlocks
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('deadlock') ||
      message.includes('could not serialize') ||
      message.includes('connection') ||
      message.includes('timeout')
    );
  },
};

/**
 * Delay execution for a specified number of milliseconds
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a database operation with automatic retry on transient failures
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await db.select().from(users).where(eq(users.id, userId)),
 *   { maxAttempts: 5 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxAttempts, delayMs, shouldRetry } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or error is not retriable
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff
      const backoffDelay = delayMs * Math.pow(2, attempt - 1);
      await delay(backoffDelay);
    }
  }

  // Should never reach here due to throw in loop, but TypeScript needs it
  throw lastError;
}

/**
 * Type guard to check if error is a database constraint violation
 */
export function isConstraintViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('duplicate key') ||
    message.includes('violates unique constraint') ||
    message.includes('violates foreign key constraint') ||
    message.includes('violates check constraint')
  );
}

/**
 * Type guard to check if error is a database not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('not found') || message.includes('no rows');
}

/**
 * Extract constraint name from Postgres error message
 *
 * @example
 * ```typescript
 * // Error: duplicate key value violates unique constraint "players_session_id_name_key"
 * getConstraintName(error) // => "players_session_id_name_key"
 * ```
 */
export function getConstraintName(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const match = error.message.match(/constraint "([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Helper to execute a transaction with typed return value
 *
 * This is a convenience wrapper that provides better TypeScript inference
 * than using db.transaction directly in some cases.
 *
 * @example
 * ```typescript
 * const result = await executeTransaction(db, async (tx) => {
 *   const user = await tx.insert(users).values({ name: 'Alice' }).returning();
 *   const posts = await tx.select().from(posts).where(eq(posts.userId, user.id));
 *   return { user, posts };
 * });
 * ```
 */
export async function executeTransaction<T>(
  dbInstance: { transaction: <U>(fn: (tx: Transaction) => Promise<U>) => Promise<U> },
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return await dbInstance.transaction(fn);
}
