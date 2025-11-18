/**
 * Host-specific hook for controlling game flow.
 *
 * Provides host controls for starting rounds, judging answers, and advancing the game.
 * Subscribes to game events to keep UI in sync.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useGameChannel, type GameEventHandlers } from './useGameChannel';
import { useStartGame, useJudgeAnswer, useFinalizeJudgment } from './mutations/use-game-mutations';

/**
 * Advance to next round or finish game (host only).
 * POST /api/sessions/[id]/rounds
 *
 * This will automatically start the new round (no separate start action needed).
 */
export function useNextRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to advance round');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state and rounds (to fetch new track)
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      queryClient.invalidateQueries({
        queryKey: ['sessions', sessionId, 'rounds'],
      });
    },
  });
}

/**
 * Reveal track without buzzing (timeout/skip).
 * PATCH /api/sessions/[id]/rounds/current with action: reveal
 */
export function useRevealTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/rounds/current`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to reveal track');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

/**
 * End the game early (host only).
 * PATCH /api/sessions/[id] with action: end
 */
export function useEndGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to end game');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      // Invalidate game state and players
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'players'] });
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
  const judgeAnswer = useJudgeAnswer();
  const finalizeJudgment = useFinalizeJudgment();
  const nextRound = useNextRound();
  const revealTrack = useRevealTrack();
  const endGame = useEndGame();

  // Default event handlers that invalidate queries
  const defaultHandlers: GameEventHandlers = useMemo(() => ({
    onPlayerJoined: () => {
      console.log('[useHost] onPlayerJoined - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onPlayerLeft: () => {
      console.log('[useHost] onPlayerLeft - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onGameStarted: () => {
      console.log('[useHost] onGameStarted - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onRoundStart: () => {
      console.log('[useHost] onRoundStart - invalidating session and rounds queries');
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
      console.log('[useHost] onBuzz - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onRoundResult: () => {
      console.log('[useHost] onRoundResult - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onReveal: () => {
      console.log('[useHost] onReveal - invalidating players query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId, 'players'],
        });
      }
    },

    onStateChange: () => {
      console.log('[useHost] onStateChange - invalidating session query');
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['sessions', sessionId],
        });
      }
    },

    onGameEnd: () => {
      console.log('[useHost] onGameEnd - invalidating session and players queries');
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
    // Host actions
    startGame: useCallback(
      (settings?: {
        totalRounds?: number;
        allowHostToPlay?: boolean;
        allowSingleUser?: boolean;
        enableTextInputMode?: boolean;
      }) => {
        if (!sessionId) throw new Error('No session ID');
        return startGame.mutate({ sessionId, settings });
      },
      [sessionId, startGame]
    ),

    judgeAnswer: useCallback(
      (correct: boolean) => {
        if (!sessionId) throw new Error('No session ID');
        return judgeAnswer.mutate({ sessionId, correct });
      },
      [sessionId, judgeAnswer]
    ),

    finalizeJudgment: useCallback(
      (overrides?: Record<string, boolean>) => {
        if (!sessionId) throw new Error('No session ID');
        return finalizeJudgment.mutate({ sessionId, overrides });
      },
      [sessionId, finalizeJudgment]
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
    isJudging: judgeAnswer.isPending,
    isFinalizing: finalizeJudgment.isPending,
    isAdvancing: nextRound.isPending,
    isRevealing: revealTrack.isPending,
    isEndingGame: endGame.isPending,
  };
}
