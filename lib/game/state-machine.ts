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
 * Type guard to check if a string is a valid GameState.
 */
export function isGameState(state: string): state is GameState {
  return ['lobby', 'playing', 'buzzed', 'reveal', 'finished'].includes(state);
}

/**
 * Validate and convert a string to GameState.
 * Throws an error if the state is invalid.
 */
export function validateGameState(state: string | null): GameState {
  if (!state || !isGameState(state)) {
    throw new Error(`Invalid game state: ${state}`);
  }
  return state;
}

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
    return GAME_CONFIG.INCORRECT_PENALTY;
  }

  // Correct answer: MAX_POINTS_PER_ROUND - elapsed_seconds
  // Example: buzzed at 3.5s = 26.5 points
  const points = GAME_CONFIG.MAX_POINTS_PER_ROUND - elapsedSeconds;

  // Minimum MIN_POINTS_FOR_CORRECT for correct answers (even if slow)
  return Math.max(GAME_CONFIG.MIN_POINTS_FOR_CORRECT, Math.round(points * 10) / 10);
}

/**
 * Validate player count for game start.
 */
export function isValidPlayerCount(count: number): boolean {
  return count >= GAME_CONFIG.MIN_PLAYERS && count <= GAME_CONFIG.MAX_PLAYERS;
}

/**
 * Check if a round number is valid.
 */
export function isValidRound(roundNumber: number): boolean {
  return roundNumber >= GAME_CONFIG.MIN_ROUND_NUMBER && roundNumber <= GAME_CONFIG.TOTAL_ROUNDS;
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
        if (params?.currentRound === GAME_CONFIG.TOTAL_ROUNDS) {
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
  MIN_ROUND_NUMBER: 1,
  MAX_POINTS_PER_ROUND: 30,
  MAX_TRACK_LENGTH_SECONDS: 30,
  INCORRECT_PENALTY: -10,
  MIN_POINTS_FOR_CORRECT: 1,
} as const;
