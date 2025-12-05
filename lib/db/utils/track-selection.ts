/**
 * Track selection utilities for game lifecycle.
 *
 * Provides optimized track selection algorithms with difficulty filtering
 * and artist deduplication, using the pre-computed popularity_score column.
 */

import { db, type Transaction } from '../client';
import { tracks, packTracks, gameRounds, trackArtists, artists } from '../schema';
import { eq, and, gte, lte, notInArray, sql } from 'drizzle-orm';
import { getDifficultyRange, getExpandedDifficultyRange, type Difficulty } from './difficulty';

/**
 * Select a random track from a pack with difficulty filtering.
 *
 * Uses the pre-computed `popularity_score` column for efficient filtering.
 * This eliminates the N+1 query problem from calling calculate_track_popularity_score()
 * in WHERE clauses.
 *
 * Progressive fallback:
 * 1. Strict difficulty range
 * 2. Expanded range ±15
 * 3. Any track from pack (no difficulty filter)
 *
 * @param packId - The pack to select from
 * @param difficulty - Difficulty level
 * @param tx - Optional transaction
 * @returns Track ID or null if pack is empty
 *
 * @example
 * ```typescript
 * const trackId = await selectTrackForStartGame('pack-uuid', 'hard');
 * // Returns a track with popularity score between 15-40
 * ```
 */
export async function selectTrackForStartGame(
  packId: string,
  difficulty: Difficulty,
  tx?: Transaction
): Promise<string | null> {
  const client = tx ?? db;
  const { min, max } = getDifficultyRange(difficulty);

  // Attempt 1: Strict difficulty range
  // Uses indexed popularity_score column - MUCH faster than function call
  let result = await client
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .where(
      and(
        eq(packTracks.packId, packId),
        sql`${tracks.popularityScore} >= ${min}`,
        sql`${tracks.popularityScore} <= ${max}`
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (result.length > 0) {
    return result[0].id;
  }

  // Attempt 2: Expand range by ±15
  const expanded = getExpandedDifficultyRange(difficulty);
  result = await client
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .where(
      and(
        eq(packTracks.packId, packId),
        sql`${tracks.popularityScore} >= ${expanded.min}`,
        sql`${tracks.popularityScore} <= ${expanded.max}`
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (result.length > 0) {
    return result[0].id;
  }

  // Attempt 3: Any track from pack (ultimate fallback)
  result = await client
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .where(eq(packTracks.packId, packId))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return result.length > 0 ? result[0].id : null;
}

/**
 * Track with artist information for efficient deduplication.
 */
interface TrackWithArtists {
  id: string;
  artists: string; // Comma-separated artist names
}

/**
 * Select the next round track with difficulty filtering and artist deduplication.
 *
 * Progressive fallback (4 attempts):
 * 1. Unused track + difficulty + prefer unused artists
 * 2. Unused track + difficulty (any artist)
 * 3. Unused track + expanded difficulty
 * 4. Any unused track (ignore difficulty)
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses pre-computed popularity_score column (indexed)
 * - Batch fetches all candidates with artists in a single query
 * - Performs artist deduplication in TypeScript (not repeated SQL function calls)
 *
 * @param params - Selection parameters
 * @returns Track ID or null if no tracks available
 *
 * @example
 * ```typescript
 * const trackId = await selectTrackForAdvanceRound({
 *   sessionId: 'session-uuid',
 *   packId: 'pack-uuid',
 *   difficulty: 'medium',
 *   usedTrackIds: ['track1', 'track2'],
 *   tx: transaction
 * });
 * ```
 */
export async function selectTrackForAdvanceRound({
  sessionId,
  packId,
  difficulty,
  usedTrackIds,
  tx,
}: {
  sessionId: string;
  packId: string;
  difficulty: Difficulty;
  usedTrackIds: string[];
  tx?: Transaction;
}): Promise<string | null> {
  const client = tx ?? db;
  const { min, max } = getDifficultyRange(difficulty);

  // Get all artists that have been used in this game
  // Single query - MUCH faster than repeated get_track_artists() calls
  const usedArtistsResult = await client
    .select({
      artists: sql<string>`string_agg(DISTINCT ${artists.name}, ', ' ORDER BY ${artists.name})`,
    })
    .from(gameRounds)
    .innerJoin(trackArtists, eq(trackArtists.trackId, gameRounds.trackId))
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(gameRounds.sessionId, sessionId))
    .groupBy(gameRounds.trackId);

  const usedArtistStrings = new Set(
    usedArtistsResult.map((r) => r.artists).filter((a): a is string => a !== null)
  );

  // Attempt 1: Unused track + difficulty + prefer unused artists
  // Fetch candidates with artists in a single batch query
  const attempt1Candidates = await client
    .select({
      id: tracks.id,
      artists: sql<string>`string_agg(${artists.name}, ', ' ORDER BY ${trackArtists.position})`,
    })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .innerJoin(trackArtists, eq(trackArtists.trackId, tracks.id))
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(
      and(
        eq(packTracks.packId, packId),
        usedTrackIds.length > 0 ? notInArray(tracks.id, usedTrackIds) : undefined,
        sql`${tracks.popularityScore} >= ${min}`,
        sql`${tracks.popularityScore} <= ${max}`
      )
    )
    .groupBy(tracks.id)
    .orderBy(sql`RANDOM()`);

  // Filter out tracks with used artists in TypeScript (not SQL)
  const unusedArtistTracks = attempt1Candidates.filter(
    (track) => !usedArtistStrings.has(track.artists)
  );

  if (unusedArtistTracks.length > 0) {
    return unusedArtistTracks[0].id;
  }

  // Attempt 2: Unused track + difficulty (any artist)
  if (attempt1Candidates.length > 0) {
    return attempt1Candidates[0].id;
  }

  // Attempt 3: Expand difficulty range by ±15
  const expanded = getExpandedDifficultyRange(difficulty);
  const attempt3Result = await client
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .where(
      and(
        eq(packTracks.packId, packId),
        usedTrackIds.length > 0 ? notInArray(tracks.id, usedTrackIds) : undefined,
        sql`${tracks.popularityScore} >= ${expanded.min}`,
        sql`${tracks.popularityScore} <= ${expanded.max}`
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (attempt3Result.length > 0) {
    return attempt3Result[0].id;
  }

  // Attempt 4: Any unused track (ignore difficulty)
  const attempt4Result = await client
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(packTracks, eq(packTracks.trackId, tracks.id))
    .where(
      and(
        eq(packTracks.packId, packId),
        usedTrackIds.length > 0 ? notInArray(tracks.id, usedTrackIds) : undefined
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return attempt4Result.length > 0 ? attempt4Result[0].id : null;
}
