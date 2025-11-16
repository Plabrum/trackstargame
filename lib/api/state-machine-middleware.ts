/**
 * State machine middleware for API routes.
 *
 * Provides validation and transition helpers for enforcing game rules.
 */

import { GameState, isValidTransition, getNextState, isValidPlayerCount, GAME_CONFIG } from '@/lib/game/state-machine';

type GameSession = {
  state: string | null;
  current_round?: number | null;
  [key: string]: any;
};

export class StateTransitionError extends Error {
  constructor(message: string, public readonly from: GameState, public readonly to: GameState) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameRuleError';
  }
}

/**
 * Validate that a state transition is allowed.
 * Throws StateTransitionError if invalid.
 */
export function validateStateTransition(from: GameState, to: GameState): void {
  if (!isValidTransition(from, to)) {
    throw new StateTransitionError(
      `Invalid state transition: ${from} → ${to}`,
      from,
      to
    );
  }
}

/**
 * Get the next game state for an action, with validation.
 * Throws StateTransitionError if the transition is not valid.
 */
export function getNextGameState(
  currentState: GameState,
  action: 'start' | 'start_round' | 'buzz' | 'judge' | 'next_round' | 'finish',
  params?: { currentRound?: number; nextRound?: number }
): GameState {
  const nextState = getNextState(currentState, action, params);

  if (nextState === currentState) {
    throw new StateTransitionError(
      `Cannot perform action '${action}' in state '${currentState}'`,
      currentState,
      currentState
    );
  }

  // Validate the transition
  validateStateTransition(currentState, nextState);

  return nextState;
}

/**
 * Enforce game rules before starting a game.
 * Throws GameRuleError if rules are violated.
 */
export function enforceGameStartRules(session: GameSession, playerCount: number): void {
  // Must be in lobby
  if (session.state !== 'lobby') {
    throw new GameRuleError(`Cannot start game from state '${session.state}'. Must be in lobby.`);
  }

  // Must have valid player count
  if (!isValidPlayerCount(playerCount)) {
    throw new GameRuleError(
      `Invalid player count: ${playerCount}. Must be between ${GAME_CONFIG.MIN_PLAYERS} and ${GAME_CONFIG.MAX_PLAYERS}.`
    );
  }
}

/**
 * Enforce game rules before starting a round.
 * Throws GameRuleError if rules are violated.
 */
export function enforceRoundStartRules(session: GameSession): void {
  // Must be in ready state
  if (session.state !== 'ready') {
    throw new GameRuleError(`Cannot start round from state '${session.state}'. Must be in ready state.`);
  }

  // Must have a current round set
  if (!session.current_round || session.current_round < 1) {
    throw new GameRuleError('No round is set as current.');
  }
}

/**
 * Enforce game rules before buzzing.
 * Throws GameRuleError if rules are violated.
 */
export function enforceBuzzRules(session: GameSession): void {
  // Must be in playing state
  if (session.state !== 'playing') {
    throw new GameRuleError(`Cannot buzz in state '${session.state}'. Round must be playing.`);
  }
}

/**
 * Enforce game rules before judging an answer.
 * Throws GameRuleError if rules are violated.
 */
export function enforceJudgeRules(session: GameSession): void {
  // Must be in buzzed state (or playing for timeout reveals)
  if (session.state !== 'buzzed' && session.state !== 'playing') {
    throw new GameRuleError(`Cannot judge in state '${session.state}'. Must be in buzzed or playing state.`);
  }
}

/**
 * Enforce game rules before advancing to next round.
 * Throws GameRuleError if rules are violated.
 */
export function enforceNextRoundRules(session: GameSession, nextRoundNumber: number): void {
  // Must be in reveal state
  if (session.state !== 'reveal') {
    throw new GameRuleError(`Cannot advance to next round from state '${session.state}'. Must be in reveal state.`);
  }

  // Check if exceeding max rounds
  if (nextRoundNumber > GAME_CONFIG.TOTAL_ROUNDS) {
    throw new GameRuleError(`Cannot create round ${nextRoundNumber}. Maximum is ${GAME_CONFIG.TOTAL_ROUNDS}.`);
  }
}
