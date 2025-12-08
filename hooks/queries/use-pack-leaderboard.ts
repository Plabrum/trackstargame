/**
 * React Query hook for pack leaderboards.
 *
 * Fetches top scores for a specific pack.
 */

'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getPackLeaderboardAction } from '@/lib/db/actions/query-actions';
import type { PackLeaderboardEntry } from '@/lib/db/queries/leaderboards';

/**
 * Fetch top N scores for a specific pack.
 *
 * Only queries when packId is provided (enabled guard).
 * Results are cached for 5 minutes since leaderboards update infrequently.
 *
 * @param packId - UUID of the pack
 * @param limit - Number of top scores to return (default 10)
 * @returns React Query result with leaderboard data
 *
 * @example
 * ```typescript
 * const { data: leaderboard, isLoading } = usePackLeaderboard(packId, 10);
 * ```
 */
export function usePackLeaderboard(
  packId: string,
  limit: number = 10
): UseQueryResult<PackLeaderboardEntry[], Error> {
  return useQuery({
    queryKey: ['packs', packId, 'leaderboard', limit],
    queryFn: () => getPackLeaderboardAction(packId, limit), // ✅ Call Server Action
    enabled: !!packId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
