/**
 * Game lifecycle Server Actions.
 *
 * Handles game start, round advancement, and game reset operations.
 * Replaces Postgres RPC functions with TypeScript implementations using Drizzle ORM.
 */

'use server';

import { db } from '../client';
import { gameSessions, gameRounds, players, packTracks } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { selectTrackForStartGame, selectTrackForAdvanceRound } from '../utils/track-selection';
import { isValidDifficulty, type Difficulty } from '../utils/difficulty';

/**
 * Start a game from lobby state.
 *
 * Replaces: `start_game(session_id)` RPC function
 *
 * Flow:
 * 1. Validate lobby state
 * 2. Get difficulty and set track filtering
 * 3. Create host player if needed (allow_host_to_play)
 * 4. Validate minimum player count (1 player)
 * 5. Select track with difficulty-based progressive fallback (3 attempts)
 * 6. Create first round
 * 7. Transition session to 'playing'
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses pre-computed popularity_score column (90%+ faster)
 * - No repeated function calls in WHERE clauses
 *
 * @param params - Session ID and optional Spotify user ID
 * @returns Result with id, state, current_round, first_track_id
 *
 * @throws Error if not in lobby state, no players, or no tracks available
 *
 * @example
 * ```typescript
 * const result = await startGameAction({ sessionId: 'session-uuid', spotifyUserId: 'spotify:user:123' });
 * // Returns: { id, state: 'playing', currentRound: 1, firstTrackId }
 * ```
 */
export async function startGameAction({
  sessionId,
  spotifyUserId,
}: {
  sessionId: string;
  spotifyUserId?: string;
}): Promise<{
  id: string;
  state: string;
  currentRound: number;
  firstTrackId: string;
}> {
  return await db.transaction(async (tx) => {
    // Get session
    const sessions = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Game session not found');
    }

    const session = sessions[0];

    if (session.state !== 'lobby') {
      throw new Error('Game can only be started from lobby state');
    }

    const difficulty = (session.difficulty ?? 'medium') as Difficulty;

    if (!isValidDifficulty(difficulty)) {
      throw new Error(`Invalid difficulty: ${difficulty}`);
    }

    // Count players
    const playerCountResult = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(players)
      .where(eq(players.sessionId, sessionId));

    let playerCount = playerCountResult[0]?.count ?? 0;

    // Create host player if needed
    if (session.allowHostToPlay) {
      const hostPlayers = await tx
        .select({ id: players.id })
        .from(players)
        .where(and(eq(players.sessionId, sessionId), eq(players.isHost, true)))
        .limit(1);

      if (hostPlayers.length === 0) {
        // Create host player
        await tx.insert(players).values({
          sessionId,
          name: session.hostName,
          isHost: true,
          score: 0,
          spotifyUserId: spotifyUserId || null,
        });

        playerCount += 1;
      }
    }

    // Validate minimum player count
    if (playerCount < 1) {
      throw new Error('Need at least 1 player to start');
    }

    // Select track with difficulty filtering and progressive fallback
    const trackId = await selectTrackForStartGame(session.packId!, difficulty, tx);

    if (!trackId) {
      throw new Error('Pack has no available tracks');
    }

    // Create first round
    await tx.insert(gameRounds).values({
      sessionId,
      roundNumber: 1,
      trackId,
    });

    // Update session to playing
    await tx
      .update(gameSessions)
      .set({
        state: 'playing',
        currentRound: 1,
        roundStartTime: new Date().toISOString(),
      })
      .where(eq(gameSessions.id, sessionId));

    return {
      id: session.id,
      state: 'playing',
      currentRound: 1,
      firstTrackId: trackId,
    };
  });
}

/**
 * Advance to the next round or finish the game.
 *
 * Replaces: `advance_round(session_id)` RPC function
 *
 * Flow:
 * 1. Validate 'reveal' state
 * 2. Check if game is over (current_round + 1 > total_rounds)
 * 3. If finished, transition to 'finished' state
 * 4. Select next track with difficulty filtering and artist deduplication (4 attempts)
 * 5. Create new round
 * 6. Transition session to 'playing'
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses pre-computed popularity_score column
 * - Batch query for artists (not repeated get_track_artists() calls)
 * - Artist deduplication in TypeScript (not SQL subqueries)
 *
 * @param sessionId - The game session to advance
 * @returns Result with session_id, new_state, new_round, track_id
 *
 * @throws Error if not in reveal state or no tracks available
 *
 * @example
 * ```typescript
 * const result = await advanceRoundAction('session-uuid');
 * // Returns: { sessionId, newState: 'playing', newRound: 2, trackId }
 * // OR: { sessionId, newState: 'finished', newRound: 10, trackId: null }
 * ```
 */
export async function advanceRoundAction(
  sessionId: string
): Promise<{
  sessionId: string;
  newState: string;
  newRound: number;
  trackId: string | null;
}> {
  return await db.transaction(async (tx) => {
    // Get session
    const sessions = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Game session not found');
    }

    const session = sessions[0];

    if (session.state !== 'reveal') {
      throw new Error('Can only advance from reveal state');
    }

    const nextRound = (session.currentRound ?? 0) + 1;

    // Check if game is over
    if (nextRound > (session.totalRounds ?? 10)) {
      await tx
        .update(gameSessions)
        .set({ state: 'finished' })
        .where(eq(gameSessions.id, sessionId));

      return {
        sessionId,
        newState: 'finished',
        newRound: session.currentRound ?? 0,
        trackId: null,
      };
    }

    const difficulty = (session.difficulty ?? 'medium') as Difficulty;

    if (!isValidDifficulty(difficulty)) {
      throw new Error(`Invalid difficulty: ${difficulty}`);
    }

    // Get all used track IDs for this session
    const usedTracksResult = await tx
      .select({ trackId: gameRounds.trackId })
      .from(gameRounds)
      .where(eq(gameRounds.sessionId, sessionId));

    const usedTrackIds = usedTracksResult
      .map((r) => r.trackId)
      .filter((id): id is string => id !== null);

    // Select next track with difficulty filtering and artist deduplication
    const trackId = await selectTrackForAdvanceRound({
      sessionId,
      packId: session.packId!,
      difficulty,
      usedTrackIds,
      tx,
    });

    if (!trackId) {
      throw new Error('No more unused tracks available');
    }

    // Create new round
    await tx.insert(gameRounds).values({
      sessionId,
      roundNumber: nextRound,
      trackId,
    });

    // Update session
    await tx
      .update(gameSessions)
      .set({
        currentRound: nextRound,
        state: 'playing',
        roundStartTime: new Date().toISOString(),
      })
      .where(eq(gameSessions.id, sessionId));

    return {
      sessionId,
      newState: 'playing',
      newRound: nextRound,
      trackId,
    };
  });
}

/**
 * Reset a finished game with a new pack.
 *
 * Replaces: `reset_game(session_id, new_pack_id)` RPC function
 *
 * Flow:
 * 1. Validate session exists and is in 'finished' state
 * 2. Validate new pack exists and has tracks
 * 3. Delete all rounds (CASCADE deletes round_answers)
 * 4. Reset all player scores to 0
 * 5. Select random track from new pack
 * 6. Create first round with new track
 * 7. Update session to 'playing' with new pack
 *
 * @param params - Session ID and new pack ID
 * @returns Result with session_id, new_state, first_round, first_track_id
 *
 * @throws Error if not in finished state or pack has no tracks
 *
 * @example
 * ```typescript
 * const result = await resetGameAction({
 *   sessionId: 'session-uuid',
 *   newPackId: 'new-pack-uuid'
 * });
 * // Returns: { sessionId, newState: 'playing', firstRound: 1, firstTrackId }
 * ```
 */
export async function resetGameAction({
  sessionId,
  newPackId,
}: {
  sessionId: string;
  newPackId: string;
}): Promise<{
  sessionId: string;
  newState: string;
  firstRound: number;
  firstTrackId: string;
}> {
  return await db.transaction(async (tx) => {
    // Validate session exists and is in finished state
    const sessions = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessions[0];

    if (session.state !== 'finished') {
      throw new Error(`Can only reset from finished state, current state: ${session.state}`);
    }

    // Validate new pack exists and has tracks
    const packTracksResult = await tx
      .select({ trackId: packTracks.trackId })
      .from(packTracks)
      .where(eq(packTracks.packId, newPackId))
      .limit(1);

    if (packTracksResult.length === 0) {
      throw new Error('Pack has no tracks available');
    }

    // Delete all rounds (cascade deletes round_answers via FK)
    await tx.delete(gameRounds).where(eq(gameRounds.sessionId, sessionId));

    // Reset all player scores to 0 (keeps players in session)
    await tx
      .update(players)
      .set({ score: 0 })
      .where(eq(players.sessionId, sessionId));

    // Get difficulty for track selection
    const difficulty = (session.difficulty ?? 'medium') as Difficulty;

    // Select track from new pack with difficulty filtering
    const trackId = await selectTrackForStartGame(newPackId, difficulty, tx);

    if (!trackId) {
      throw new Error('Pack has no available tracks');
    }

    // Create first round with new track
    await tx.insert(gameRounds).values({
      sessionId,
      roundNumber: 1,
      trackId,
    });

    // Update session to playing state with new pack
    await tx
      .update(gameSessions)
      .set({
        packId: newPackId,
        state: 'playing',
        currentRound: 1,
        roundStartTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(gameSessions.id, sessionId));

    return {
      sessionId,
      newState: 'playing',
      firstRound: 1,
      firstTrackId: trackId,
    };
  });
}
