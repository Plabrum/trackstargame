/**
 * Player-specific hook for game participation.
 *
 * Provides player controls (buzzing) and subscribes to game events.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameChannel, type GameEventHandlers } from './useGameChannel';
import { useBuzz } from './mutations/use-game-mutations';

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

  // Default event handlers that invalidate queries
  const defaultHandlers: GameEventHandlers = {
    onPlayerJoined: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'players'],
        });
      }
    }, [sessionId, queryClient]),

    onPlayerLeft: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'players'],
        });
      }
    }, [sessionId, queryClient]),

    onGameStarted: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId],
        });
      }
    }, [sessionId, queryClient]),

    onRoundStart: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'rounds'],
        });
      }
    }, [sessionId, queryClient]),

    onBuzz: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId],
        });
      }
    }, [sessionId, queryClient]),

    onRoundResult: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'players'],
        });
      }
    }, [sessionId, queryClient]),

    onReveal: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'players'],
        });
      }
    }, [sessionId, queryClient]),

    onStateChange: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId],
        });
      }
    }, [sessionId, queryClient]),

    onGameEnd: useCallback(() => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: ['game_sessions', sessionId, 'players'],
        });
      }
    }, [sessionId, queryClient]),
  };

  // Merge default handlers with custom handlers
  const mergedHandlers: GameEventHandlers = {
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
  };

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
  };
}
