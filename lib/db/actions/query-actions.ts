/**
 * Server Actions for read-only queries.
 *
 * These are Next.js Server Actions (marked with 'use server') that wrap
 * query functions for use in client components via React Query.
 *
 * Server Actions provide:
 * - Server-side execution (database access stays on server)
 * - Type safety end-to-end
 * - Automatic serialization/deserialization
 */

'use server';

import { getPackLeaderboard, type PackLeaderboardEntry } from '../queries/leaderboards';

/**
 * Get top N scores for a pack from finished games (Server Action).
 *
 * Called from client via React Query hook.
 *
 * @param packId - UUID of the pack
 * @param limit - Number of top scores to return (default 10)
 * @returns Array of leaderboard entries
 *
 * @example
 * ```typescript
 * // In React Query hook:
 * const { data } = useQuery({
 *   queryKey: ['packs', packId, 'leaderboard'],
 *   queryFn: () => getPackLeaderboardAction(packId, 10)
 * });
 * ```
 */
export async function getPackLeaderboardAction(
  packId: string,
  limit: number = 10
): Promise<PackLeaderboardEntry[]> {
  return await getPackLeaderboard(packId, limit);
}
