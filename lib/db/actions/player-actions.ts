/**
 * Player action Server Actions.
 *
 * Handles buzz, answer submission, judgment operations, and leaderboards.
 * Replaces Postgres RPC functions and triggers with TypeScript implementations using Drizzle ORM.
 */

'use server';

import { db } from '../client';
import { gameSessions, gameRounds, players, roundAnswers } from '../schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

/**
 * Player leaderboard entry.
 */
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
}

/**
 * Buzz in during a round.
 *
 * Replaces: Database triggers (`auto_calculate_elapsed()` and `update_session_state_on_buzz()`)
 *
 * Flow:
 * 1. Validate session is in 'playing' state
 * 2. Get round and session round_start_time
 * 3. Calculate elapsed_seconds (NOW - round_start_time)
 * 4. Update round with buzzer_player_id, elapsed_seconds, buzz_time (atomic check)
 * 5. Update session state to 'buzzed'
 *
 * TRIGGER REPLACEMENT:
 * - Previously: BEFORE UPDATE trigger calculated elapsed_seconds and buzz_time
 * - Previously: AFTER UPDATE trigger updated session state
 * - Now: All logic in single TypeScript transaction (explicit, testable, debuggable)
 *
 * @param params - Session, player, and round number
 * @returns Result with round_id, buzzer_player_id, elapsed_seconds, buzz_time
 *
 * @throws Error if not in playing state, round not found, or already buzzed
 *
 * @example
 * ```typescript
 * const result = await buzzAction({
 *   sessionId: 'session-uuid',
 *   playerId: 'player-uuid',
 *   currentRound: 3
 * });
 * // Returns: { roundId, buzzerPlayerId, elapsedSeconds, buzzTime }
 * ```
 */
export async function buzzAction({
  sessionId,
  playerId,
  currentRound,
}: {
  sessionId: string;
  playerId: string;
  currentRound: number;
}): Promise<{
  roundId: string;
  buzzerPlayerId: string;
  elapsedSeconds: number;
  buzzTime: string;
}> {
  return await db.transaction(async (tx) => {
    // Get session for round_start_time and state validation
    const sessions = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Game session not found');
    }

    const session = sessions[0];

    if (session.state !== 'playing') {
      throw new Error('Can only buzz in playing state');
    }

    if (!session.roundStartTime) {
      throw new Error('Round start time not set');
    }

    // Calculate elapsed time (replaces auto_calculate_elapsed trigger)
    const now = new Date();
    const roundStartTime = new Date(session.roundStartTime);
    const elapsedSeconds = (now.getTime() - roundStartTime.getTime()) / 1000;

    // Validate elapsed time (optional sanity check)
    if (elapsedSeconds < 0 || elapsedSeconds > 30) {
      throw new Error(`Invalid elapsed time: ${elapsedSeconds}s`);
    }

    // Update round with atomic check (prevents race conditions)
    const updatedRounds = await tx
      .update(gameRounds)
      .set({
        buzzerPlayerId: playerId,
        elapsedSeconds: elapsedSeconds.toFixed(2), // Store as string (numeric type)
        buzzTime: now.toISOString(),
      })
      .where(
        and(
          eq(gameRounds.sessionId, sessionId),
          eq(gameRounds.roundNumber, currentRound),
          isNull(gameRounds.buzzerPlayerId) // Optimistic lock
        )
      )
      .returning({ id: gameRounds.id });

    if (updatedRounds.length === 0) {
      throw new Error('Round not found or already buzzed');
    }

    const roundId = updatedRounds[0].id;

    // Update session state to 'buzzed' (replaces update_session_state_on_buzz trigger)
    await tx
      .update(gameSessions)
      .set({ state: 'buzzed' })
      .where(eq(gameSessions.id, sessionId));

    return {
      roundId,
      buzzerPlayerId: playerId,
      elapsedSeconds,
      buzzTime: now.toISOString(),
    };
  });
}

/**
 * Judge a buzzed answer (correct or incorrect).
 *
 * Replaces: `judge_answer(session_id, correct)` RPC function
 *
 * Flow:
 * 1. Validate session is in 'buzzed' state
 * 2. Calculate points based on elapsed time
 * 3. Update round with judgment
 * 4. Update player score
 * 5. Transition session to 'reveal' state
 *
 * @param params - Session ID and correctness judgment
 * @returns Result with round_id, buzzer_player_id, correct, points_awarded, new_player_score
 *
 * @throws Error if session not in 'buzzed' state
 *
 * @example
 * ```typescript
 * const result = await judgeAnswerAction({
 *   sessionId: '...',
 *   correct: true
 * });
 * // Returns: { roundId, buzzerPlayerId, correct, pointsAwarded, newPlayerScore }
 * ```
 */
export async function judgeAnswerAction({
  sessionId,
  correct,
}: {
  sessionId: string;
  correct: boolean;
}): Promise<{
  roundId: string;
  buzzerPlayerId: string;
  correct: boolean;
  pointsAwarded: number;
  newPlayerScore: number;
}> {
  return await db.transaction(async (tx) => {
    // Validate state
    const session = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new Error('Game session not found');
    }

    if (session[0].state !== 'buzzed') {
      throw new Error('Can only judge in buzzed state');
    }

    const currentRound = session[0].currentRound;
    if (currentRound === null) {
      throw new Error('No current round');
    }

    // Get current round
    const rounds = await tx
      .select()
      .from(gameRounds)
      .where(
        and(
          eq(gameRounds.sessionId, sessionId),
          eq(gameRounds.roundNumber, currentRound)
        )
      )
      .limit(1);

    if (rounds.length === 0) {
      throw new Error('Round not found');
    }

    const round = rounds[0];

    if (!round.buzzerPlayerId) {
      throw new Error('No player has buzzed');
    }

    // Calculate points
    // Correct: max(1, 30 - elapsed_seconds)
    // Incorrect: -10
    const elapsedSeconds = round.elapsedSeconds ? Number(round.elapsedSeconds) : 0;
    const pointsAwarded = correct
      ? Math.max(1, Math.round(30 - elapsedSeconds))
      : -10;

    // Update round with judgment
    await tx
      .update(gameRounds)
      .set({
        correct,
        pointsAwarded,
      })
      .where(eq(gameRounds.id, round.id));

    // Update player score
    const updatedPlayers = await tx
      .update(players)
      .set({
        score: sql`${players.score} + ${pointsAwarded}`,
      })
      .where(eq(players.id, round.buzzerPlayerId))
      .returning({ score: players.score });

    const newPlayerScore = updatedPlayers[0]?.score ?? 0;

    // Update session state to 'reveal'
    await tx
      .update(gameSessions)
      .set({ state: 'reveal' })
      .where(eq(gameSessions.id, sessionId));

    return {
      roundId: round.id,
      buzzerPlayerId: round.buzzerPlayerId,
      correct,
      pointsAwarded,
      newPlayerScore,
    };
  });
}

/**
 * Submit an answer in text input mode.
 *
 * Replaces: `submit_answer(session_id, player_id, answer, auto_validated, points_awarded)` RPC function
 *
 * Flow:
 * 1. Validate text input mode is enabled
 * 2. Validate session is in 'playing' state
 * 3. Check for duplicate submission
 * 4. Insert answer
 * 5. Check if all players submitted
 * 6. Auto-finalize in solo mode OR transition to 'submitted' state
 *
 * @param params - Session, player, answer, validation data
 * @returns Result with answer_id and all_players_submitted flag
 *
 * @throws Error if text input disabled, wrong state, or duplicate submission
 *
 * @example
 * ```typescript
 * const result = await submitAnswerAction({
 *   sessionId: '...',
 *   playerId: '...',
 *   answer: 'Shake It Off',
 *   autoValidated: true,
 *   pointsAwarded: 20
 * });
 * // Returns: { answerId, allPlayersSubmitted: true }
 * ```
 */
export async function submitAnswerAction({
  sessionId,
  playerId,
  answer,
  autoValidated,
  pointsAwarded,
}: {
  sessionId: string;
  playerId: string;
  answer: string;
  autoValidated: boolean;
  pointsAwarded: number;
}): Promise<{
  answerId: string;
  allPlayersSubmitted: boolean;
}> {
  return await db.transaction(async (tx) => {
    // Validate session
    const session = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new Error('Game session not found');
    }

    if (!session[0].enableTextInputMode) {
      throw new Error('Text input mode not enabled');
    }

    if (session[0].state !== 'playing') {
      throw new Error('Can only submit in playing state');
    }

    const currentRound = session[0].currentRound;
    if (currentRound === null) {
      throw new Error('No current round');
    }

    // Get current round
    const rounds = await tx
      .select()
      .from(gameRounds)
      .where(
        and(
          eq(gameRounds.sessionId, sessionId),
          eq(gameRounds.roundNumber, currentRound)
        )
      )
      .limit(1);

    if (rounds.length === 0) {
      throw new Error('Round not found');
    }

    const round = rounds[0];

    // Check for duplicate submission
    const existingAnswer = await tx
      .select()
      .from(roundAnswers)
      .where(
        and(
          eq(roundAnswers.roundId, round.id),
          eq(roundAnswers.playerId, playerId)
        )
      )
      .limit(1);

    if (existingAnswer.length > 0) {
      throw new Error('Already submitted an answer');
    }

    // Insert answer
    const insertedAnswers = await tx
      .insert(roundAnswers)
      .values({
        roundId: round.id,
        playerId,
        submittedAnswer: answer,
        autoValidated,
        isCorrect: autoValidated, // Auto-validated answers are marked correct initially
        pointsAwarded,
      })
      .returning({ id: roundAnswers.id });

    const answerId = insertedAnswers[0].id;

    // Check if all players submitted
    const totalPlayersResult = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(players)
      .where(eq(players.sessionId, sessionId));

    const totalPlayers = totalPlayersResult[0]?.count ?? 0;

    const submittedCountResult = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(roundAnswers)
      .where(eq(roundAnswers.roundId, round.id));

    const submittedCount = submittedCountResult[0]?.count ?? 0;
    const allPlayersSubmitted = submittedCount === totalPlayers;

    // Auto-finalize in solo mode (1 player with auto-validated answer)
    if (totalPlayers === 1 && allPlayersSubmitted && autoValidated) {
      // Update player score
      await tx
        .update(players)
        .set({
          score: sql`${players.score} + ${pointsAwarded}`,
        })
        .where(eq(players.id, playerId));

      // Update round
      await tx
        .update(gameRounds)
        .set({
          correct: true,
          pointsAwarded,
        })
        .where(eq(gameRounds.id, round.id));

      // Transition to 'reveal' state
      await tx
        .update(gameSessions)
        .set({ state: 'reveal' })
        .where(eq(gameSessions.id, sessionId));
    } else if (allPlayersSubmitted) {
      // Transition to 'submitted' state (waiting for host judgment)
      await tx
        .update(gameSessions)
        .set({ state: 'submitted' })
        .where(eq(gameSessions.id, sessionId));
    }

    return {
      answerId,
      allPlayersSubmitted,
    };
  });
}

/**
 * Finalize judgments after all players submit answers (text input mode).
 *
 * Replaces: `finalize_judgments(session_id, overrides)` RPC function
 *
 * Flow:
 * 1. Validate session is in 'submitted' state
 * 2. Process each answer, applying host overrides if provided
 * 3. Award points only for correct answers
 * 4. Transition session to 'reveal' state
 * 5. Build and return leaderboard
 *
 * @param params - Session ID and optional host judgment overrides
 * @returns Success flag and leaderboard (sorted by score descending)
 *
 * @throws Error if session not in 'submitted' state
 *
 * @example
 * ```typescript
 * const result = await finalizeJudgmentsAction({
 *   sessionId: '...',
 *   overrides: {
 *     'player-uuid-1': true,  // Override: mark correct
 *     'player-uuid-2': false, // Override: mark incorrect
 *   }
 * });
 * // Returns: {
 * //   success: true,
 * //   leaderboard: [
 * //     { playerId: '...', playerName: 'Alice', score: 50 },
 * //     { playerId: '...', playerName: 'Bob', score: 30 },
 * //   ]
 * // }
 * ```
 */
export async function finalizeJudgmentsAction({
  sessionId,
  overrides = {},
}: {
  sessionId: string;
  overrides?: Record<string, boolean>;
}): Promise<{
  success: boolean;
  leaderboard: LeaderboardEntry[];
}> {
  return await db.transaction(async (tx) => {
    // Validate state
    const session = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new Error('Game session not found');
    }

    if (session[0].state !== 'submitted') {
      throw new Error('Can only finalize in submitted state');
    }

    const currentRound = session[0].currentRound;
    if (currentRound === null) {
      throw new Error('No current round');
    }

    // Get current round
    const rounds = await tx
      .select()
      .from(gameRounds)
      .where(
        and(
          eq(gameRounds.sessionId, sessionId),
          eq(gameRounds.roundNumber, currentRound)
        )
      )
      .limit(1);

    if (rounds.length === 0) {
      throw new Error('Round not found');
    }

    const round = rounds[0];

    // Get all answers for this round
    const answers = await tx
      .select()
      .from(roundAnswers)
      .where(eq(roundAnswers.roundId, round.id));

    // Process each answer
    for (const answer of answers) {
      // Determine final judgment
      // If host provided an override, use it; otherwise use auto-validation
      const finalJudgment =
        answer.playerId in overrides
          ? overrides[answer.playerId]
          : (answer.autoValidated ?? false);

      // Update answer with final judgment
      await tx
        .update(roundAnswers)
        .set({ isCorrect: finalJudgment })
        .where(eq(roundAnswers.id, answer.id));

      // Award points only if correct
      if (finalJudgment) {
        await tx
          .update(players)
          .set({
            score: sql`${players.score} + ${answer.pointsAwarded ?? 0}`,
          })
          .where(eq(players.id, answer.playerId));
      }
    }

    // Update session state to 'reveal'
    await tx
      .update(gameSessions)
      .set({ state: 'reveal' })
      .where(eq(gameSessions.id, sessionId));

    // Build leaderboard (sorted by score descending)
    const leaderboardData = await tx
      .select({
        playerId: players.id,
        playerName: players.name,
        score: players.score,
      })
      .from(players)
      .where(eq(players.sessionId, sessionId))
      .orderBy(sql`${players.score} DESC`);

    const leaderboard: LeaderboardEntry[] = leaderboardData.map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      score: entry.score ?? 0,
    }));

    return {
      success: true,
      leaderboard,
    };
  });
}
