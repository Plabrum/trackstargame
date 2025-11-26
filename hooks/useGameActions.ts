/**
 * useGameActions Hook
 *
 * Builds game context from session/player/round data and returns available actions
 * based on the current state and role.
 */

import { useMemo } from 'react';
import { getStateMachine } from '@/lib/game/state-machines';
import type {
  GameContext,
  GameState,
  Role,
  ActionDescriptor,
} from '@/lib/game/state-machines/base';
import type { TableRow } from '@/lib/types/database-helpers';

type GameSession = TableRow<'game_sessions'>;
type Player = TableRow<'players'>;
type GameRound = TableRow<'game_rounds'>;
type RoundAnswer = TableRow<'round_answers'>;

interface UseGameActionsOptions {
  role: Role;
  session: GameSession | null | undefined;
  players: Player[];
  currentRound?: GameRound | null;
  playerId?: string; // Current user's player ID
  submittedAnswers?: RoundAnswer[]; // For text input mode
}

/**
 * Get available actions for the current game state and role.
 *
 * This hook builds the GameContext from your session/player data and
 * returns a list of ActionDescriptor objects that can be rendered
 * directly in the UI.
 */
export function useGameActions({
  role,
  session,
  players,
  currentRound,
  playerId,
  submittedAnswers = [],
}: UseGameActionsOptions): ActionDescriptor[] {
  return useMemo(() => {
    // If no session, return empty actions
    if (!session) return [];

    // Build game context
    const context: GameContext = {
      sessionId: session.id,
      state: session.state as GameState,
      currentRound: session.current_round ?? 1,
      totalRounds: session.total_rounds,

      // Settings
      allowHostToPlay: session.allow_host_to_play,
      enableTextInputMode: session.enable_text_input_mode,

      // Player info
      playerCount: players.length,
      hasJoined: role === 'host' || players.some((p) => p.id === playerId),
      playerId,

      // Round-specific info
      hasPlayerBuzzed: currentRound?.buzzer_player_id != null,
      hasCurrentPlayerSubmitted:
        playerId && currentRound
          ? submittedAnswers.some((a) => a.player_id === playerId && a.round_id === currentRound.id)
          : false,
      allPlayersSubmitted:
        currentRound && players.length > 0
          ? submittedAnswers.filter((a) => a.round_id === currentRound.id).length === players.length
          : false,
    };

    // Get the appropriate state machine for this game mode
    const stateMachine = getStateMachine(session);

    // Get actions from mode-specific state machine
    return stateMachine.getAvailableActions(context.state, role, context);
  }, [
    role,
    session,
    players,
    currentRound,
    playerId,
    submittedAnswers,
  ]);
}

