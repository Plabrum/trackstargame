/**
 * Supabase API response types and utilities.
 * Provides type-safe wrappers for Supabase query results.
 */

/**
 * Standard Supabase error object.
 */
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Standard Supabase API response shape.
 *
 * @example
 * ```typescript
 * const result = await supabase.from('table').select('*') as SupabaseResponse<MyType[]>;
 * if (result.error) {
 *   return handleError(result.error);
 * }
 * const data = result.data; // Type: MyType[]
 * ```
 */
export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * Type helper for Supabase single-row queries.
 */
export type SupabaseSingleResponse<T> = SupabaseResponse<T>;

/**
 * Type helper for Supabase multi-row queries.
 */
export type SupabaseListResponse<T> = SupabaseResponse<T[]>;
