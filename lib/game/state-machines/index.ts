/**
 * State Machine Factory
 *
 * Returns the appropriate state machine based on game mode settings.
 */

import type { GameStateMachine, GameMode } from './base';
import { BuzzerModeStateMachine } from './buzzer-mode';
import { TextInputModeStateMachine } from './text-input-mode';
import type { Tables } from '@/lib/types/database';

type GameSession = Tables<'game_sessions'>;

// Singleton instances
const buzzerMode = new BuzzerModeStateMachine();
const textInputMode = new TextInputModeStateMachine();

/**
 * Get the appropriate state machine for a game session
 *
 * @param session - The game session
 * @returns The state machine instance for the game mode
 */
export function getStateMachine(session: GameSession): GameStateMachine {
  if (session.enable_text_input_mode) {
    return textInputMode;
  }
  return buzzerMode;
}

/**
 * Get a state machine by mode identifier
 *
 * @param mode - The game mode ('buzzer' or 'text-input')
 * @returns The state machine instance
 */
export function getStateMachineByMode(mode: GameMode): GameStateMachine {
  switch (mode) {
    case 'text-input':
      return textInputMode;
    case 'buzzer':
    default:
      return buzzerMode;
  }
}

// Re-export types and classes
export type { GameStateMachine, GameMode } from './base';
export { BuzzerModeStateMachine } from './buzzer-mode';
export { TextInputModeStateMachine } from './text-input-mode';
