/**
 * Track popularity score calculation utilities.
 *
 * Calculates a combined popularity score (0-100) based on:
 * - Track's Spotify popularity (60% weight)
 * - Artist's follower count, log-normalized (40% weight)
 *
 * This replaces the Postgres `calculate_track_popularity_score()` function
 * with a TypeScript implementation for better testability and maintainability.
 */

import { db, type Transaction } from '../client';
import { tracks, trackArtists, artists } from '../schema';
import { eq } from 'drizzle-orm';
import { max } from 'drizzle-orm';

/**
 * Calculate combined popularity score (0-100) for a track.
 *
 * Formula:
 * - Track popularity: 0-100 (from Spotify)
 * - Artist followers: Normalized to 0-100 using log10 scale
 * - Combined: (track * 0.6) + (artist * 0.4)
 *
 * **Bug Fix**: Original Postgres function used `log()` (natural log) in implementation
 * but comment mentioned `log10()`. This implementation uses `Math.log10()` for clarity
 * and consistency with the documented intent.
 *
 * @param trackId - UUID of the track
 * @param tx - Optional transaction context
 * @returns Popularity score 0-100 (rounded to 2 decimal places)
 *
 * @example
 * ```typescript
 * const score = await calculateTrackPopularityScore(trackId);
 * // Returns: 75.23 (popular track with moderately popular artist)
 * ```
 */
export async function calculateTrackPopularityScore(
  trackId: string,
  tx?: Transaction
): Promise<number> {
  const client = tx ?? db;

  // Fetch track's Spotify popularity (0-100, or default to 50)
  const trackData = await client
    .select({ spotifyPopularity: tracks.spotifyPopularity })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1);

  const trackPopularity = trackData[0]?.spotifyPopularity ?? 50;

  // Fetch max artist followers for this track
  // Using MAX because primary artist's popularity matters most
  const artistData = await client
    .select({ maxFollowers: max(artists.spotifyFollowers) })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(trackArtists.trackId, trackId));

  const maxArtistFollowers = artistData[0]?.maxFollowers ?? 0;

  // Normalize artist followers to 0-100 scale using log10
  // Most popular artists have ~100M followers (Taylor Swift, Ed Sheeran, etc.)
  // log10(100M) = 8, so we divide by 8 to get 0-1 range, then multiply by 100
  let normalizedArtistScore: number;
  if (maxArtistFollowers > 0) {
    normalizedArtistScore = Math.min(
      100,
      (Math.log10(maxArtistFollowers + 1) / 8) * 100
    );
  } else {
    // Default to 50 if no follower data available
    normalizedArtistScore = 50;
  }

  // Combined score: weighted average
  // Track popularity is more recent/accurate, so weighted higher (60%)
  const combinedScore = trackPopularity * 0.6 + normalizedArtistScore * 0.4;

  // Round to 2 decimal places for consistency with Postgres function
  return Math.round(combinedScore * 100) / 100;
}

/**
 * Batch calculate popularity scores for multiple tracks.
 *
 * More efficient than calling `calculateTrackPopularityScore()` individually
 * when you need scores for many tracks.
 *
 * @param trackIds - Array of track UUIDs
 * @param tx - Optional transaction context
 * @returns Map of trackId -> popularity score
 *
 * @example
 * ```typescript
 * const scores = await batchCalculatePopularityScores(['id1', 'id2', 'id3']);
 * // Returns: Map { 'id1' => 75.23, 'id2' => 42.10, 'id3' => 88.50 }
 * ```
 */
export async function batchCalculatePopularityScores(
  trackIds: string[],
  tx?: Transaction
): Promise<Map<string, number>> {
  if (trackIds.length === 0) {
    return new Map();
  }

  const scores = new Map<string, number>();

  // Calculate scores sequentially for now
  // TODO: Optimize with a single query if needed for performance
  for (const trackId of trackIds) {
    const score = await calculateTrackPopularityScore(trackId, tx);
    scores.set(trackId, score);
  }

  return scores;
}

/**
 * Get difficulty range for a given difficulty level.
 *
 * Returns min/max popularity scores for filtering tracks.
 *
 * Difficulty levels:
 * - easy: 70-100 (very popular tracks)
 * - medium: 40-70 (moderately popular)
 * - hard: 15-40 (less known)
 * - legendary: 0-15 (obscure tracks)
 *
 * @param difficulty - Difficulty level string
 * @returns Object with min and max popularity scores
 */
export function getDifficultyRange(difficulty: string): {
  min: number;
  max: number;
} {
  switch (difficulty) {
    case 'easy':
      return { min: 70, max: 100 };
    case 'medium':
      return { min: 40, max: 70 };
    case 'hard':
      return { min: 15, max: 40 };
    case 'legendary':
      return { min: 0, max: 15 };
    default:
      // Default to medium if invalid
      return { min: 40, max: 70 };
  }
}

/**
 * Expand difficulty range by a given amount (for fallback track selection).
 *
 * Used in `start_game` and `advance_round` when no tracks found in strict range.
 *
 * @param difficulty - Difficulty level string
 * @param expansion - Amount to expand range (default: 15)
 * @returns Expanded min/max range, clamped to 0-100
 */
export function getExpandedDifficultyRange(
  difficulty: string,
  expansion: number = 15
): { min: number; max: number } {
  const { min, max } = getDifficultyRange(difficulty);

  return {
    min: Math.max(0, min - expansion),
    max: Math.min(100, max + expansion),
  };
}
