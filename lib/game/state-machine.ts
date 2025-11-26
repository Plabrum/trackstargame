/**
 * Game state machine and business logic.
 *
 * Defines states, transitions, scoring, validation rules, and available actions per state/role.
 */

// Game states
export type GameState = 'lobby' | 'playing' | 'buzzed' | 'submitted' | 'reveal' | 'finished';

// User roles
export type Role = 'host' | 'player';

// All possible game actions (state machine decides which are available based on role/state)
export type GameAction =
  // Host actions
  | { type: 'start_game' }
  | { type: 'judge_answer'; correct: boolean }
  | { type: 'finalize_judgments'; overrides?: Record<string, boolean> }
  | { type: 'advance_round' }
  | { type: 'end_game' }
  | { type: 'update_settings'; settings: GameSettings }
  | { type: 'reveal_answer' }
  // Player actions
  | { type: 'join_session'; playerName: string }
  | { type: 'buzz' }
  | { type: 'submit_answer'; answer: string };

// Game settings (matches database schema)
export type GameSettings = {
  allow_host_to_play?: boolean;
  enable_text_input_mode?: boolean;
  total_rounds?: number;
};

// Action descriptor with metadata for UI rendering
export type ActionDescriptor<T = GameAction> = {
  action: T;
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

// Game context required to determine available actions
export type GameContext = {
  // Session info
  sessionId: string;
  state: GameState;
  currentRound: number;
  totalRounds: number;

  // Settings
  allowHostToPlay: boolean;
  enableTextInputMode: boolean;

  // Player info
  playerCount: number;
  hasJoined: boolean; // For current player/host
  playerId?: string; // Current player/host ID

  // Round-specific info (for 'playing', 'buzzed', 'submitted' states)
  hasPlayerBuzzed?: boolean; // Has anyone buzzed in current round
  hasCurrentPlayerSubmitted?: boolean; // Has current player submitted in current round
  allPlayersSubmitted?: boolean; // Have all players submitted in current round
};

// State transitions mapping
const STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  lobby: ['playing', 'finished'], // first round starts or game ends early
  playing: ['buzzed', 'submitted', 'reveal', 'finished'], // buzzed if someone buzzes, submitted if all submit answers, reveal if no buzz/timeout, or host ends game
  buzzed: ['reveal', 'finished'], // host judges or ends game
  submitted: ['reveal', 'finished'], // host finalizes judgments or ends game
  reveal: ['playing', 'finished'], // next round starts, finished if game over
  finished: ['playing'], // Allow restart with new pack
};

/**
 * Type guard to check if a string is a valid GameState.
 */
export function isGameState(state: string): state is GameState {
  return ['lobby', 'playing', 'buzzed', 'submitted', 'reveal', 'finished'].includes(state);
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
  // Example: buzzed at 3.5s = 27 points (rounded)
  const points = GAME_CONFIG.MAX_POINTS_PER_ROUND - elapsedSeconds;

  // Minimum MIN_POINTS_FOR_CORRECT for correct answers (even if slow)
  return Math.max(GAME_CONFIG.MIN_POINTS_FOR_CORRECT, Math.round(points));
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
  action: 'start' | 'buzz' | 'submit' | 'judge' | 'finalize' | 'next_round' | 'finish',
  params?: { currentRound?: number; nextRound?: number; totalRounds?: number }
): GameState {
  switch (action) {
    case 'start':
      // Starting the game: lobby → playing (first round created and started)
      if (currentState === 'lobby') return 'playing';
      break;

    case 'buzz':
      if (currentState === 'playing') return 'buzzed';
      break;

    case 'submit':
      // All players have submitted answers (text input mode)
      if (currentState === 'playing') return 'submitted';
      break;

    case 'judge':
      if (currentState === 'buzzed') return 'reveal';
      // Allow host to reveal without buzz (timeout case)
      if (currentState === 'playing') return 'reveal';
      break;

    case 'finalize':
      // Host finalizes judgments after all answers submitted
      if (currentState === 'submitted') return 'reveal';
      break;

    case 'next_round':
      if (currentState === 'reveal') {
        // Check if next round will exceed total rounds
        const nextRoundNumber = params?.nextRound ?? (params?.currentRound ?? 0) + 1;
        const totalRounds = params?.totalRounds ?? GAME_CONFIG.TOTAL_ROUNDS;
        if (nextRoundNumber > totalRounds) {
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

/**
 * Get available actions for a given game state and role.
 *
 * This is the core of the action-based state machine. Given the current game state,
 * user role, and game context, it returns a list of all actions available to that user,
 * including whether each action is enabled and why it might be disabled.
 *
 * @param state - Current game state
 * @param role - User role (host or player)
 * @param context - Game context (session info, player counts, settings, etc.)
 * @returns Array of action descriptors with metadata for UI rendering
 */
export function getAvailableActions(
  state: GameState,
  role: Role,
  context: GameContext
): ActionDescriptor[] {
  const actions: ActionDescriptor[] = [];

  // Host Actions
  if (role === 'host') {
    switch (state) {
      case 'lobby':
        // Start game action
        // If host can play, min = 0 (host can play solo), otherwise min = 2
        const minPlayers = context.allowHostToPlay ? 0 : GAME_CONFIG.MIN_PLAYERS;
        const canStart = context.playerCount >= minPlayers && context.playerCount <= GAME_CONFIG.MAX_PLAYERS;

        actions.push({
          action: { type: 'start_game' },
          label: 'Start Game',
          description: `Begin the game with ${context.playerCount} player(s)`,
          enabled: canStart,
          disabledReason: canStart
            ? undefined
            : context.playerCount < minPlayers
              ? `Need at least ${minPlayers} player(s) to start`
              : `Maximum ${GAME_CONFIG.MAX_PLAYERS} players allowed`,
          variant: 'primary',
        });

        // Update settings action (only in lobby)
        actions.push({
          action: { type: 'update_settings', settings: {} },
          label: 'Game Settings',
          description: 'Configure game options',
          enabled: true,
          variant: 'secondary',
        });
        break;

      case 'playing':
        // Reveal answer (timeout case - no buzz)
        actions.push({
          action: { type: 'reveal_answer' },
          label: 'Reveal Answer',
          description: 'Show answer if time expires or no one buzzes',
          enabled: true,
          variant: 'secondary',
        });
        break;

      case 'buzzed':
        // Judge correct
        actions.push({
          action: { type: 'judge_answer', correct: true },
          label: 'Correct ✓',
          description: 'Award points to the buzzer',
          enabled: true,
          variant: 'primary',
        });

        // Judge incorrect
        actions.push({
          action: { type: 'judge_answer', correct: false },
          label: 'Incorrect ✗',
          description: 'Deduct points from the buzzer',
          enabled: true,
          variant: 'danger',
        });
        break;

      case 'submitted':
        // Finalize judgments (after all players submit in text mode)
        actions.push({
          action: { type: 'finalize_judgments', overrides: {} },
          label: 'Finalize Answers',
          description: 'Review and judge all submitted answers',
          enabled: context.allPlayersSubmitted ?? false,
          disabledReason: context.allPlayersSubmitted
            ? undefined
            : 'Waiting for all players to submit',
          variant: 'primary',
        });
        break;

      case 'reveal':
        // Advance to next round or finish game
        const isLastRound = context.currentRound >= context.totalRounds;

        actions.push({
          action: { type: 'advance_round' },
          label: isLastRound ? 'Finish Game' : 'Next Round',
          description: isLastRound
            ? 'View final results'
            : `Proceed to round ${context.currentRound + 1}`,
          enabled: true,
          variant: 'primary',
        });
        break;

      case 'finished':
        // No actions in finished state (just display results)
        // Could add "Play Again" or "Return to Lobby" actions here if needed
        break;
    }
  }

  // Player Actions
  if (role === 'player') {
    switch (state) {
      case 'lobby':
        // Join session action (only if not already joined)
        if (!context.hasJoined) {
          actions.push({
            action: { type: 'join_session', playerName: '' },
            label: 'Join Game',
            description: 'Enter your name and join the game',
            enabled: context.playerCount < GAME_CONFIG.MAX_PLAYERS,
            disabledReason: context.playerCount >= GAME_CONFIG.MAX_PLAYERS
              ? 'Game is full'
              : undefined,
            variant: 'primary',
          });
        }
        break;

      case 'playing':
        // Text input mode: submit answer instead of buzzing
        if (context.enableTextInputMode) {
          const hasSubmitted = context.hasCurrentPlayerSubmitted ?? false;
          actions.push({
            action: { type: 'submit_answer', answer: '' },
            label: 'Submit Answer',
            description: 'Type your answer',
            enabled: !hasSubmitted,
            disabledReason: hasSubmitted ? 'You already submitted' : undefined,
            variant: 'primary',
          });
        } else {
          // Buzz mode: buzz in to answer
          const alreadyBuzzed = context.hasPlayerBuzzed ?? false;
          actions.push({
            action: { type: 'buzz' },
            label: 'Buzz In',
            description: 'Signal that you know the answer',
            enabled: !alreadyBuzzed,
            disabledReason: alreadyBuzzed ? 'Someone already buzzed' : undefined,
            variant: 'primary',
          });
        }
        break;

      case 'buzzed':
      case 'submitted':
      case 'reveal':
        // No actions for players in these states (just watch)
        break;

      case 'finished':
        // No actions (game over)
        // Could add "Play Again" action here if needed
        break;
    }
  }

  return actions;
}
