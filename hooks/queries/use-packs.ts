/**
 * Query hooks for packs data.
 *
 * Handles fetching pack listings and individual pack details.
 */

import { useQuery } from '@tanstack/react-query';
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
      const response = await fetch('/api/packs');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch packs');
      }
      return response.json() as Promise<Pack[]>;
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

      const response = await fetch(`/api/packs/${packId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pack');
      }
      return response.json() as Promise<Pack & { tracks: Track[] }>;
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

      const response = await fetch(`/api/packs/${packId}/tracks`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tracks');
      }
      return response.json() as Promise<Track[]>;
    },
    enabled: !!packId,
  });
}
