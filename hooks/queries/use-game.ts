/**
 * Query hooks for game session data.
 *
 * Uses Supabase-native approach with direct queries and postgres_changes realtime.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TableRow } from '@/lib/types/database-helpers';

type GameSession = TableRow<'game_sessions'>;
type Player = TableRow<'players'>;
type GameRound = TableRow<'game_rounds'>;
type Track = TableRow<'tracks'>;

/**
 * Fetch a game session with real-time updates.
 *
 * Uses direct Supabase query
 */
export function useGameSession(sessionId: string | null) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as GameSession;
    },
    enabled: !!sessionId,
    staleTime: 0, // Always consider data stale for immediate updates
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
 * Uses direct Supabase query
 */
export function useGamePlayers(sessionId: string | null) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId, 'players'],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (error) throw error;
      return data as Player[];
    },
    enabled: !!sessionId,
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnMount: true, // Refetch when component mounts
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
 * Uses direct Supabase query
 */
export function useGameRounds(sessionId: string | null) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['sessions', sessionId, 'rounds'],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true });

      if (error) throw error;
      return data as GameRound[];
    },
    enabled: !!sessionId,
    staleTime: 0, // Always consider data stale for immediate updates
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

/**
 * Fetch track details by track ID.
 *
 * Uses direct Supabase query (no realtime needed for static track data)
 */
export function useTrack(trackId: string | null) {
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['tracks', trackId],
    queryFn: async () => {
      if (!trackId) return null;

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (error) {
        console.error('Failed to fetch track:', error);
        return null;
      }

      return data as Track;
    },
    enabled: !!trackId,
    staleTime: Infinity, // Track data doesn't change, cache indefinitely
  });

  return query;
}

/**
 * Fetch album art from Spotify API using a track's Spotify ID.
 *
 * Requires Spotify access token.
 */
export function useSpotifyAlbumArt(spotifyId: string | null, accessToken: string | null) {
  const query = useQuery({
    queryKey: ['spotify-album-art', spotifyId],
    queryFn: async () => {
      if (!spotifyId || !accessToken) return null;

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${spotifyId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          console.error('Failed to fetch Spotify track info');
          return null;
        }

        const data = await response.json();
        return data.album?.images?.[0]?.url || null;
      } catch (error) {
        console.error('Error fetching album art:', error);
        return null;
      }
    },
    enabled: !!spotifyId && !!accessToken,
    staleTime: Infinity, // Album art URLs don't change, cache indefinitely
  });

  return query;
}
