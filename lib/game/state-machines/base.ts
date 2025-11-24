/**
 * Base state machine interface and shared types
 */

import type { GameState, GameAction, Role, GameContext, ActionDescriptor } from '../state-machine';

export type { GameState, GameAction, Role, GameContext, ActionDescriptor };

/**
 * Game mode identifier
 */
export type GameMode = 'buzzer' | 'text-input';

/**
 * Base interface that all game mode state machines must implement
 */
export interface GameStateMachine {
  /**
   * Get the mode identifier
   */
  getMode(): GameMode;

  /**
   * Get valid state transitions for this mode
   */
  getStateTransitions(): Record<GameState, GameState[]>;

  /**
   * Get available actions for a given state and role
   */
  getAvailableActions(
    state: GameState,
    role: Role,
    context: GameContext
  ): ActionDescriptor[];

  /**
   * Determine next state based on action
   */
  getNextState(
    currentState: GameState,
    action: string,
    params?: { currentRound?: number; nextRound?: number; totalRounds?: number }
  ): GameState;
}
