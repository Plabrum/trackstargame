/**
 * useGameActions Hook
 *
 * Builds game context from session/player/round data and returns available actions
 * based on the current state and role.
 */

import { useMemo } from 'react';
import {
  getAvailableActions,
  type GameContext,
  type GameState,
  type Role,
  type ActionDescriptor,
  type HostAction,
  type PlayerAction,
} from '@/lib/game/state-machine';
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
}: UseGameActionsOptions): ActionDescriptor<HostAction | PlayerAction>[] {
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
      allowSingleUser: session.allow_single_user,
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

    // Get actions from state machine
    return getAvailableActions(context.state, role, context);
  }, [
    role,
    session,
    players,
    currentRound,
    playerId,
    submittedAnswers,
  ]);
}

/**
 * Helper hook specifically for host actions
 */
export function useHostActions(
  session: GameSession | null | undefined,
  players: Player[],
  currentRound?: GameRound | null,
  submittedAnswers?: RoundAnswer[]
): ActionDescriptor<HostAction>[] {
  return useGameActions({
    role: 'host',
    session,
    players,
    currentRound,
    submittedAnswers,
  }) as ActionDescriptor<HostAction>[];
}

/**
 * Helper hook specifically for player actions
 */
export function usePlayerActions(
  session: GameSession | null | undefined,
  players: Player[],
  playerId: string | undefined | null,
  currentRound?: GameRound | null,
  submittedAnswers?: RoundAnswer[]
): ActionDescriptor<PlayerAction>[] {
  return useGameActions({
    role: 'player',
    session,
    players,
    currentRound,
    playerId: playerId ?? undefined,
    submittedAnswers,
  }) as ActionDescriptor<PlayerAction>[];
}
