/**
 * Leaderboard query helpers.
 *
 * Provides read-only query functions for pack leaderboards.
 */

import { db, type Transaction } from '../client';
import { gameSessions, players } from '../schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export interface PackLeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  hostName: string;
  gameDate: string;
  sessionId: string;
  spotifyUserId: string | null;
}

/**
 * Get top N scores for a pack from finished single-player games.
 *
 * Shows the BEST score per Spotify user (not all their scores).
 * Uses Spotify user ID to track personal bests across multiple games.
 * Falls back to showing all scores for players without Spotify user IDs.
 *
 * Results are sorted by score (descending). For each Spotify user,
 * only their highest score is shown with the most recent player name.
 *
 * **Note:** Only includes solo/single-player scores (is_host = true).
 * Multiplayer/party game scores are excluded.
 *
 * @param packId - UUID of the pack
 * @param limit - Number of top scores to return (default 10)
 * @param tx - Optional transaction context
 * @returns Array of leaderboard entries showing best score per user
 *
 * @example
 * ```typescript
 * const leaderboard = await getPackLeaderboard(packId);
 * // Returns: [
 * //   { playerId: '...', playerName: 'Alice', score: 267, spotifyUserId: 'spotify:user:123', ... },
 * //   { playerId: '...', playerName: 'Bob', score: 245, spotifyUserId: 'spotify:user:456', ... },
 * //   ...
 * // ]
 * ```
 */
export async function getPackLeaderboard(
  packId: string,
  limit: number = 10,
  tx?: Transaction
): Promise<PackLeaderboardEntry[]> {
  const client = tx ?? db;

  // Use DISTINCT ON to get the best score per Spotify user
  // PostgreSQL-specific: DISTINCT ON returns the first row per group
  // We order by spotify_user_id, score DESC, so we get the highest score for each user
  const result = await client.execute<{
    player_id: string;
    player_name: string;
    score: number;
    host_name: string;
    game_date: string;
    session_id: string;
    spotify_user_id: string | null;
  }>(sql`
    SELECT DISTINCT ON (COALESCE(p.spotify_user_id, p.id))
      p.id as player_id,
      p.name as player_name,
      p.score,
      gs.host_name,
      gs.created_at as game_date,
      gs.id as session_id,
      p.spotify_user_id
    FROM game_sessions gs
    INNER JOIN players p ON p.session_id = gs.id
    WHERE gs.pack_id = ${packId}
      AND gs.state = 'finished'
      AND p.is_host = true
      AND p.spotify_user_id IS NOT NULL
    ORDER BY COALESCE(p.spotify_user_id, p.id), p.score DESC, gs.created_at DESC
    LIMIT ${limit}
  `);

  return result.map((row: any) => ({
    playerId: row.player_id,
    playerName: row.player_name,
    score: row.score ?? 0,
    hostName: row.host_name,
    gameDate: row.game_date ?? '',
    sessionId: row.session_id,
    spotifyUserId: row.spotify_user_id,
  }));
}
