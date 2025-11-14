/**
 * Query hooks for packs data.
 *
 * Handles fetching pack listings and individual pack details.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

type Pack = Tables<'packs'>;
type Track = Tables<'tracks'>;

/**
 * Fetch all available packs.
 */
export function usePacks() {
  return useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Pack[];
    },
  });
}

/**
 * Fetch a single pack with all its tracks.
 */
export function usePack(packId: string | null) {
  return useQuery({
    queryKey: ['packs', packId],
    queryFn: async () => {
      if (!packId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('packs')
        .select(`
          *,
          tracks (*)
        `)
        .eq('id', packId)
        .single();

      if (error) throw error;
      return data as Pack & { tracks: Track[] };
    },
    enabled: !!packId,
  });
}

/**
 * Fetch tracks for a specific pack.
 */
export function usePackTracks(packId: string | null) {
  return useQuery({
    queryKey: ['packs', packId, 'tracks'],
    queryFn: async () => {
      if (!packId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('pack_id', packId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Track[];
    },
    enabled: !!packId,
  });
}
