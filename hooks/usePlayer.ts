/**
 * Player-specific hook for game participation.
 *
 * Provides player controls (buzzing) and subscribes to game events.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameChannel, type GameEventHandlers } from './useGameChannel';
import { useBuzz } from './mutations/use-game-mutations';

export type RoundJudgment = {
  playerId: string;
  correct: boolean;
  pointsAwarded: number;
};

/**
 * Hook for player controls and real-time updates.
 *
 * Provides buzz functionality and subscribes to game events.
 *
 * @param sessionId - The game session ID
 * @param playerId - The player's ID (from joining the session)
 * @param eventHandlers - Optional event handlers for game events
 */
export function usePlayer(
  sessionId: string | null,
  playerId: string | null,
  eventHandlers?: GameEventHandlers
) {
  const queryClient = useQueryClient();
  const buzz = useBuzz();
  const [lastJudgment, setLastJudgment] = useState<RoundJudgment | null>(null);

  // Default event handlers that invalidate queries
  const defaultHandlers: GameEventHandlers = useMemo(() => ({
    onPlayerJoined: () => {
      console.log('[usePlayer] onPlayerJoined - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onPlayerLeft: () => {
      console.log('[usePlayer] onPlayerLeft - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onGameStarted: () => {
      console.log('[usePlayer] onGameStarted - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onRoundStart: () => {
      console.log('[usePlayer] onRoundStart - invalidating session and rounds queries');
      // Clear judgment from previous round
      setLastJudgment(null);
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'rounds'],
        });
      }
    },

    onBuzz: () => {
      console.log('[usePlayer] onBuzz - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onRoundResult: (event) => {
      console.log('[usePlayer] onRoundResult - invalidating players query');
      // Capture the judgment result for visual feedback
      if (event.type === 'round_result') {
        setLastJudgment({
          playerId: event.playerId,
          correct: event.correct,
          pointsAwarded: event.pointsAwarded,
        });
      }
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onReveal: () => {
      console.log('[usePlayer] onReveal - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onStateChange: () => {
      console.log('[usePlayer] onStateChange - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onGameEnd: () => {
      console.log('[usePlayer] onGameEnd - invalidating session and players queries');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },
  }), [sessionId, queryClient]);

  // Merge default handlers with custom handlers
  const mergedHandlers: GameEventHandlers = useMemo(() => ({
    onPlayerJoined: (event) => {
      defaultHandlers.onPlayerJoined?.(event);
      eventHandlers?.onPlayerJoined?.(event);
    },
    onPlayerLeft: (event) => {
      defaultHandlers.onPlayerLeft?.(event);
      eventHandlers?.onPlayerLeft?.(event);
    },
    onGameStarted: (event) => {
      defaultHandlers.onGameStarted?.(event);
      eventHandlers?.onGameStarted?.(event);
    },
    onRoundStart: (event) => {
      defaultHandlers.onRoundStart?.(event);
      eventHandlers?.onRoundStart?.(event);
    },
    onBuzz: (event) => {
      defaultHandlers.onBuzz?.(event);
      eventHandlers?.onBuzz?.(event);
    },
    onRoundResult: (event) => {
      defaultHandlers.onRoundResult?.(event);
      eventHandlers?.onRoundResult?.(event);
    },
    onReveal: (event) => {
      defaultHandlers.onReveal?.(event);
      eventHandlers?.onReveal?.(event);
    },
    onStateChange: (event) => {
      defaultHandlers.onStateChange?.(event);
      eventHandlers?.onStateChange?.(event);
    },
    onGameEnd: (event) => {
      defaultHandlers.onGameEnd?.(event);
      eventHandlers?.onGameEnd?.(event);
    },
  }), [defaultHandlers, eventHandlers]);

  // Subscribe to game channel
  useGameChannel(sessionId, mergedHandlers);

  return {
    // Player actions
    buzz: useCallback(() => {
      if (!sessionId || !playerId) {
        throw new Error('Missing session ID or player ID');
      }
      return buzz.mutate({ sessionId, playerId });
    }, [sessionId, playerId, buzz]),

    // Mutation states
    isBuzzing: buzz.isPending,
    buzzError: buzz.error,
    buzzSuccess: buzz.isSuccess,

    // Round judgment result (for visual feedback)
    lastJudgment,
  };
}
