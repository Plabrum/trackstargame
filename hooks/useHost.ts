/**
 * Host-specific hook for controlling game flow.
 *
 * Provides host controls for starting rounds, judging answers, and advancing the game.
 * Subscribes to game events to keep UI in sync.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useGameChannel, type GameEventHandlers } from './useGameChannel';
import { useStartGame, useJudgeAnswer } from './mutations/use-game-mutations';

/**
 * Start a new round (host only).
 */
export function useStartRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/game/${sessionId}/start-round`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start round');
      }

      return response.json();
    },
    onSuccess: (data, sessionId) => {
      // Invalidate game state and rounds
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', sessionId, 'rounds'],
      });
      // Return data is automatically passed through by mutateAsync
    },
  });
}

/**
 * Advance to next round or finish game (host only).
 */
export function useNextRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/game/${sessionId}/next-round`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to advance round');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state and rounds (to fetch new track)
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', sessionId, 'rounds'],
      });
    },
  });
}

/**
 * Reveal track without buzzing (timeout/skip).
 */
export function useRevealTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/game/${sessionId}/reveal`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to reveal track');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
    },
  });
}

/**
 * End the game early (host only).
 */
export function useEndGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/game/${sessionId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to end game');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state and players
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId, 'players'] });
    },
  });
}

/**
 * Hook for host controls and real-time updates.
 *
 * Provides all host-specific actions and subscribes to game events.
 *
 * @param sessionId - The game session ID
 * @param eventHandlers - Optional event handlers for game events
 */
export function useHost(
  sessionId: string | null,
  eventHandlers?: GameEventHandlers
) {
  const queryClient = useQueryClient();

  // Mutations
  const startGame = useStartGame();
  const startRound = useStartRound();
  const judgeAnswer = useJudgeAnswer();
  const nextRound = useNextRound();
  const revealTrack = useRevealTrack();
  const endGame = useEndGame();

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
    // Host actions
    startGame: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return startGame.mutate(sessionId);
      },
      [sessionId, startGame]
    ),

    startRound: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return startRound.mutateAsync(sessionId);
      },
      [sessionId, startRound]
    ),

    judgeAnswer: useCallback(
      (correct: boolean) => {
        if (!sessionId) throw new Error('No session ID');
        return judgeAnswer.mutate({ sessionId, correct });
      },
      [sessionId, judgeAnswer]
    ),

    nextRound: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return nextRound.mutate(sessionId);
      },
      [sessionId, nextRound]
    ),

    revealTrack: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return revealTrack.mutate(sessionId);
      },
      [sessionId, revealTrack]
    ),

    endGame: useCallback(
      () => {
        if (!sessionId) throw new Error('No session ID');
        return endGame.mutate(sessionId);
      },
      [sessionId, endGame]
    ),

    // Mutation states
    isStartingGame: startGame.isPending,
    isStartingRound: startRound.isPending,
    isJudging: judgeAnswer.isPending,
    isAdvancing: nextRound.isPending,
    isRevealing: revealTrack.isPending,
    isEndingGame: endGame.isPending,
  };
}
