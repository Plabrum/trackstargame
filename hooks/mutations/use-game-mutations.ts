/**
 * Mutation hooks for game actions using Supabase-native approach.
 *
 * Uses direct table operations for simple mutations and RPC functions for complex ones.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { translateDBError } from '@/lib/utils/translate-db-error';
import type { TableRow, RPCFunction } from '@/lib/types/database-helpers';

/**
 * Create a new game session.
 *
 * POST /api/sessions (still uses API route for Spotify auth)
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
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

/**
 * Join a game session as a player
 * Uses direct INSERT with RLS policy validation
 */
export function useJoinSession() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; playerName: string }) => {
      const { data, error } = await supabase
        .from('players')
        .insert({
          session_id: params.sessionId,
          name: params.playerName.trim(),
          score: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TableRow<'players'>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'players'],
      });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Start the game
 * Uses RPC function for multi-step operation
 */
export function useStartGame() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .rpc('start_game', { p_session_id: sessionId })
        .single();

      if (error) throw error;
      return data as RPCFunction<'start_game'>;
    },
    onSuccess: async (data) => {
      // Invalidate and refetch queries to ensure data is up-to-date before resolving
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions', data.id] }),
        queryClient.invalidateQueries({ queryKey: ['sessions', data.id, 'rounds'] }),
      ]);
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Buzz in during a round
 * Uses direct UPDATE with atomic check and optimistic update
 */
export function useBuzz() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      playerId: string;
      currentRound: number
    }) => {
      const { data, error } = await supabase
        .from('game_rounds')
        .update({ buzzer_player_id: params.playerId })
        .eq('session_id', params.sessionId)
        .eq('round_number', params.currentRound)
        .is('buzzer_player_id', null)
        .select()
        .single();

      if (error) throw error;
      return data as TableRow<'game_rounds'>;
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ['sessions', variables.sessionId],
      });

      const previousSession = queryClient.getQueryData<TableRow<'game_sessions'>>([
        'sessions',
        variables.sessionId,
      ]);

      queryClient.setQueryData<TableRow<'game_sessions'>>(
        ['sessions', variables.sessionId],
        (old) => {
          if (!old) return old;
          return { ...old, state: 'buzzed' as any };
        }
      );

      return { previousSession };
    },

    onError: (error, variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(
          ['sessions', variables.sessionId],
          context.previousSession
        );
      }
      throw new Error(translateDBError(error));
    },

    onSuccess: (data, variables) => {
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
 * Judge a buzzed answer
 * Uses RPC function for atomic multi-table update
 */
export function useJudgeAnswer() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; correct: boolean }) => {
      const { data, error } = await supabase
        .rpc('judge_answer', {
          p_session_id: params.sessionId,
          p_correct: params.correct,
        })
        .single();

      if (error) throw error;
      return data as RPCFunction<'judge_answer'>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'players'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Reveal track without buzzing
 * Uses direct UPDATE to set state to 'reveal'
 */
export function useRevealAnswer() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({ state: 'reveal' })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as TableRow<'game_sessions'>;
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Advance to next round
 * Uses RPC function for complex logic and random track selection
 */
export function useAdvanceRound() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .rpc('advance_round', { p_session_id: sessionId })
        .single();

      if (error) throw error;
      return data as RPCFunction<'advance_round'>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.session_id] });
      queryClient.invalidateQueries({
        queryKey: ['sessions', data.session_id, 'rounds'],
      });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Submit an answer (text input mode)
 * Uses RPC function for conditional logic
 */
export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      playerId: string;
      answer: string;
      autoValidated: boolean;
      pointsAwarded: number;
    }) => {
      const { data, error } = await supabase
        .rpc('submit_answer', {
          p_session_id: params.sessionId,
          p_player_id: params.playerId,
          p_answer: params.answer,
          p_auto_validated: params.autoValidated,
          p_points_awarded: params.pointsAwarded,
        })
        .single();

      if (error) throw error;
      return data as RPCFunction<'submit_answer'>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'rounds'],
      });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Finalize judgments after all answers submitted (host only)
 * Uses RPC function for batch updates
 */
export function useFinalizeJudgments() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      overrides?: Record<string, boolean>;
    }) => {
      const { data, error } = await supabase
        .rpc('finalize_judgments', {
          p_session_id: params.sessionId,
          p_overrides: params.overrides || {},
        })
        .single();

      if (error) throw error;
      return data as RPCFunction<'finalize_judgments'>;
    },
    onSuccess: (data, variables) => {
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
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * End the game
 * Uses direct UPDATE to set state to 'finished'
 */
export function useEndGame() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({ state: 'finished' })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as TableRow<'game_sessions'>;
    },
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Update game settings
 * Uses direct UPDATE with state check
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      allowHostToPlay: boolean;
      enableTextInputMode: boolean;
      totalRounds: number;
    }) => {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({
          allow_host_to_play: params.allowHostToPlay,
          enable_text_input_mode: params.enableTextInputMode,
          total_rounds: params.totalRounds,
        })
        .eq('id', params.sessionId)
        .eq('state', 'lobby')
        .select()
        .single();

      if (error) throw error;
      return data as TableRow<'game_sessions'>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId] });
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

/**
 * Reset game with new pack (Play Again functionality)
 * Uses RPC function for complex multi-table reset
 */
export function useResetGame() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      newPackId: string
    }) => {
      const { data, error } = await supabase
        .rpc('reset_game', {
          p_session_id: params.sessionId,
          p_new_pack_id: params.newPackId,
        })
        .single();

      if (error) throw error;
      return data as RPCFunction<'reset_game'>;
    },
    onSuccess: async (data, variables) => {
      // Invalidate all session-related queries for clean slate
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['sessions', variables.sessionId]
        }),
        queryClient.invalidateQueries({
          queryKey: ['sessions', variables.sessionId, 'players']
        }),
        queryClient.invalidateQueries({
          queryKey: ['sessions', variables.sessionId, 'rounds']
        }),
      ]);
    },
    onError: (error: Error) => {
      throw new Error(translateDBError(error));
    },
  });
}

// Legacy exports for backward compatibility during migration
export const useNextRound = useAdvanceRound;
export const useRevealTrack = useRevealAnswer;
export const useFinalizeJudgment = useFinalizeJudgments;
export const useStartRound = useRevealAnswer; // This was for transitioning from 'reveal' to 'playing', which is now handled by advance_round
