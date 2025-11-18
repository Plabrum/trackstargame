/**
 * Mutation hooks for game actions.
 *
 * Updated to use new RESTful API structure.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Create a new game session.
 *
 * POST /api/sessions
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { packId: string }) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: params.packId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      const data = await response.json();
      return data.id as string; // Return session ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

/**
 * Join an existing game session as a player.
 *
 * POST /api/sessions/[id]/players
 */
export function useJoinSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; playerName: string }) => {
      const response = await fetch(`/api/sessions/${params.sessionId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: params.playerName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join session');
      }

      const data = await response.json();
      return data.id as string; // Return player ID
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'players'],
      });
    },
  });
}

/**
 * Start the game (host only).
 *
 * PATCH /api/sessions/[id] { action: "start", settings: {...} }
 */
export function useStartGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      settings?: {
        totalRounds?: number;
        allowHostToPlay?: boolean;
        allowSingleUser?: boolean;
        enableTextInputMode?: boolean;
      };
    }) => {
      const response = await fetch(`/api/sessions/${params.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', settings: params.settings }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start game');
      }

      return response.json();
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', params.sessionId] });
    },
  });
}

/**
 * Buzz in during a round (player action).
 *
 * POST /api/sessions/[id]/rounds/current/buzz
 */
export function useBuzz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; playerId: string }) => {
      const response = await fetch(
        `/api/sessions/${params.sessionId}/rounds/current/buzz`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: params.playerId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to buzz');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
    },
  });
}

/**
 * Judge an answer as correct or incorrect (host only).
 *
 * PATCH /api/sessions/[id]/rounds/current { action: "judge", correct: boolean }
 */
export function useJudgeAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; correct: boolean }) => {
      const response = await fetch(
        `/api/sessions/${params.sessionId}/rounds/current`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'judge', correct: params.correct }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to judge answer');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'players'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
    },
  });
}

/**
 * Reveal track without buzzing
 *
 * PATCH /api/sessions/[id]/rounds/current { action: "reveal" }
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
        throw new Error(error.error || 'Failed to reveal track');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

/**
 * Start a round
 *
 * PATCH /api/sessions/[id]/rounds/current { action: "start" }
 */
export function useStartRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/rounds/current`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start round');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

/**
 * Advance to next round
 *
 * POST /api/sessions/[id]/rounds
 */
export function useNextRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to advance round');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      queryClient.invalidateQueries({
        queryKey: ['sessions', sessionId, 'rounds'],
      });
    },
  });
}

/**
 * End the game
 *
 * PATCH /api/sessions/[id] { action: "end" }
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
        throw new Error(error.error || 'Failed to end game');
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

/**
 * Submit an answer (text input mode).
 *
 * POST /api/sessions/[id]/rounds/current/submit-answer
 */
export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      playerId: string;
      answer: string
    }) => {
      const response = await fetch(
        `/api/sessions/${params.sessionId}/rounds/current/submit-answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: params.playerId,
            answer: params.answer
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit answer');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
    },
  });
}

/**
 * Finalize judgments after all answers submitted (host only).
 *
 * PATCH /api/sessions/[id]/rounds/current { action: "finalize", overrides: {...} }
 */
export function useFinalizeJudgment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      overrides?: Record<string, boolean>;
    }) => {
      const response = await fetch(
        `/api/sessions/${params.sessionId}/rounds/current`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'finalize',
            overrides: params.overrides || {}
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize judgments');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'players'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
    },
  });
}

/**
 * Update game settings
 *
 * PATCH /api/sessions/[id] { action: "settings", ... }
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      allowHostToPlay: boolean;
      allowSingleUser: boolean;
      enableTextInputMode: boolean;
      totalRounds: number;
    }) => {
      const response = await fetch(`/api/sessions/${params.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settings',
          allowHostToPlay: params.allowHostToPlay,
          allowSingleUser: params.allowSingleUser,
          enableTextInputMode: params.enableTextInputMode,
          totalRounds: params.totalRounds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId] });
    },
  });
}
