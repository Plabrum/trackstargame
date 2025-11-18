/**
 * Player-specific hook for game participation.
 *
 * Provides player controls (buzzing).
 */

import { useCallback } from 'react';
import { useBuzz } from './mutations/use-game-mutations';

/**
 * Hook for player controls.
 *
 * Provides buzz functionality. Real-time updates are handled by
 * postgres_changes subscriptions in the query hooks (useGameSession, useGamePlayers, etc.)
 *
 * @param sessionId - The game session ID
 * @param playerId - The player's ID (from joining the session)
 * @param currentRound - The current round number (required for buzzing)
 */
export function usePlayer(
  sessionId: string | null,
  playerId: string | null,
  currentRound?: number | null
) {
  const buzz = useBuzz();

  return {
    // Player actions
    buzz: useCallback(() => {
      if (!sessionId || !playerId) {
        throw new Error('Missing session ID or player ID');
      }
      if (!currentRound) {
        throw new Error('No current round');
      }
      return buzz.mutate({ sessionId, playerId, currentRound });
    }, [sessionId, playerId, currentRound, buzz]),

    // Mutation states
    isBuzzing: buzz.isPending,
    buzzError: buzz.error,
    buzzSuccess: buzz.isSuccess,
  };
}
