/**
 * Query hooks for game session data.
 *
 * Updated to use new RESTful API structure.
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
 *
 * GET /api/sessions/[id]
 */
export function useGameSession(sessionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch game session');
      }
      return response.json() as Promise<GameSession>;
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
          queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
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
 * Fetch players in a game session with real-time updates.
 *
 * GET /api/sessions/[id]/players
 */
export function useGamePlayers(sessionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId, 'players'],
    queryFn: async () => {
      if (!sessionId) return [];

      const response = await fetch(`/api/sessions/${sessionId}/players?sort=score&order=desc`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch players');
      }
      return response.json() as Promise<Player[]>;
    },
    enabled: !!sessionId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`players:${sessionId}`)
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
            queryKey: ['sessions', sessionId, 'players'],
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
 * Fetch game rounds with real-time updates.
 *
 * GET /api/sessions/[id]/rounds
 */
export function useGameRounds(sessionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId, 'rounds'],
    queryFn: async () => {
      if (!sessionId) return [];

      const response = await fetch(`/api/sessions/${sessionId}/rounds`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch rounds');
      }
      return response.json() as Promise<GameRound[]>;
    },
    enabled: !!sessionId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`rounds:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['sessions', sessionId, 'rounds'],
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
