/**
 * Game state machine and business logic.
 *
 * Defines states, transitions, scoring, and validation rules.
 */

// Game states
export type GameState = 'lobby' | 'playing' | 'buzzed' | 'reveal' | 'finished';

// State transitions mapping
const STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  lobby: ['playing'],
  playing: ['buzzed', 'reveal'], // buzzed if someone buzzes, reveal if no buzz/timeout
  buzzed: ['reveal'],
  reveal: ['playing', 'finished'], // playing for next round, finished if game over
  finished: [], // Terminal state
};

/**
 * Validate if a state transition is allowed.
 */
export function isValidTransition(from: GameState, to: GameState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Calculate points awarded for a buzz.
 *
 * @param elapsedSeconds - Time from round start to buzz
 * @param correct - Whether the answer was correct
 * @returns Points to award (can be negative)
 */
export function calculatePoints(elapsedSeconds: number, correct: boolean): number {
  if (!correct) {
    return -10;
  }

  // Correct answer: 30 - elapsed_seconds
  // Example: buzzed at 3.5s = 26.5 points
  const points = 30 - elapsedSeconds;

  // Minimum 1 point for correct answers (even if slow)
  return Math.max(1, Math.round(points * 10) / 10);
}

/**
 * Validate player count for game start.
 */
export function isValidPlayerCount(count: number): boolean {
  return count >= 2 && count <= 10;
}

/**
 * Check if a round number is valid.
 */
export function isValidRound(roundNumber: number): boolean {
  return roundNumber >= 1 && roundNumber <= 10;
}

/**
 * Determine next game state based on current state and action.
 */
export function getNextState(
  currentState: GameState,
  action: 'start' | 'buzz' | 'judge' | 'next_round' | 'finish',
  params?: { currentRound?: number }
): GameState {
  switch (action) {
    case 'start':
      if (currentState === 'lobby') return 'playing';
      break;

    case 'buzz':
      if (currentState === 'playing') return 'buzzed';
      break;

    case 'judge':
      if (currentState === 'buzzed') return 'reveal';
      // Allow host to reveal without buzz (timeout case)
      if (currentState === 'playing') return 'reveal';
      break;

    case 'next_round':
      if (currentState === 'reveal') {
        // Check if this was the last round
        if (params?.currentRound === 10) {
          return 'finished';
        }
        return 'playing';
      }
      break;

    case 'finish':
      return 'finished';
  }

  // Invalid transition, return current state
  return currentState;
}

/**
 * Validate that a buzz is valid (player hasn't buzzed yet in this round).
 */
export function canBuzz(state: GameState): boolean {
  return state === 'playing';
}

/**
 * Game configuration constants.
 */
export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
  TOTAL_ROUNDS: 10,
  MAX_POINTS_PER_ROUND: 30,
  INCORRECT_PENALTY: -10,
  MIN_POINTS_FOR_CORRECT: 1,
} as const;
