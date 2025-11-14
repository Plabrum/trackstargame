/**
 * Query hooks for game session data.
 *
 * Handles fetching game state, players, and rounds.
 * Integrates with Supabase Realtime for live updates.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

type GameSession = Tables<'game_sessions'>;
type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

/**
 * Fetch a game session with real-time updates.
 */
export function useGameSession(sessionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['game_sessions', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as GameSession;
    },
    enabled: !!sessionId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`game:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, queryClient]);

  return query;
}

/**
 * Fetch all players in a game session with real-time updates.
 */
export function useGamePlayers(sessionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['game_sessions', sessionId, 'players'],
    queryFn: async () => {
      if (!sessionId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (error) throw error;
      return data as Player[];
    },
    enabled: !!sessionId,
  });

  // Subscribe to real-time player updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`game:${sessionId}:players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['game_sessions', sessionId, 'players'],
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, queryClient]);

  return query;
}

/**
 * Fetch game rounds history for a session.
 */
export function useGameRounds(sessionId: string | null) {
  return useQuery({
    queryKey: ['game_sessions', sessionId, 'rounds'],
    queryFn: async () => {
      if (!sessionId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true });

      if (error) throw error;
      return data as GameRound[];
    },
    enabled: !!sessionId,
  });
}
