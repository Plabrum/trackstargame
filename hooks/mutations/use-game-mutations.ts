/**
 * Mutation hooks for game actions.
 *
 * Handles creating sessions, joining games, buzzing, and judging answers.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Create a new game session.
 *
 * Example usage:
 * ```tsx
 * const createSession = useCreateSession();
 *
 * createSession.mutate(
 *   { hostName: 'Alice', packId: '...' },
 *   {
 *     onSuccess: (sessionId) => {
 *       router.push(`/host/${sessionId}`);
 *     }
 *   }
 * );
 * ```
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { hostName: string; packId: string }) => {
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }

      const data = await response.json();
      return data.sessionId as string;
    },
    onSuccess: () => {
      // Invalidate sessions list if we have one
      queryClient.invalidateQueries({ queryKey: ['game_sessions'] });
    },
  });
}

/**
 * Join an existing game session as a player.
 */
export function useJoinSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; playerName: string }) => {
      const response = await fetch(`/api/session/${params.sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: params.playerName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to join session');
      }

      const data = await response.json();
      return data.playerId as string;
    },
    onSuccess: (_, variables) => {
      // Invalidate players list for this session
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', variables.sessionId, 'players'],
      });
    },
  });
}

/**
 * Start the game (host only).
 */
export function useStartGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/session/${sessionId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start game');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
    },
  });
}

/**
 * Buzz in during a round (player action).
 */
export function useBuzz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; playerId: string }) => {
      const response = await fetch(`/api/game/${params.sessionId}/buzz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: params.playerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to buzz');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate game state to show buzzer
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', variables.sessionId],
      });
    },
  });
}

/**
 * Judge an answer as correct or incorrect (host only).
 */
export function useJudgeAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      correct: boolean;
    }) => {
      console.log('Judging answer:', params);
      const response = await fetch(`/api/game/${params.sessionId}/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: params.correct }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Judge API error:', error);
        throw new Error(error.error || error.message || 'Failed to judge answer');
      }

      const result = await response.json();
      console.log('Judge API result:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('Judge success, invalidating queries');
      // Invalidate players to update scores
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', variables.sessionId, 'players'],
      });
      // Invalidate rounds history
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', variables.sessionId, 'rounds'],
      });
      // Also invalidate session to update state
      queryClient.invalidateQueries({
        queryKey: ['game_sessions', variables.sessionId],
      });
    },
    onError: (error) => {
      console.error('Judge mutation error:', error);
    },
  });
}
