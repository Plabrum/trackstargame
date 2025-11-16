/**
 * Query hooks for pack data.
 *
 * Updated to use new RESTful API structure with query params.
 */

import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/lib/types/database';

type Pack = Tables<'packs'>;
type Track = Tables<'tracks'>;

export interface PackWithCount extends Pack {
  track_count: number;
}

export interface PackWithTracks extends Pack {
  tracks: Track[];
}

/**
 * Fetch all packs.
 *
 * GET /api/packs
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
 * Fetch all packs with track counts.
 *
 * GET /api/packs?include=track_count
 */
export function usePacksWithCounts() {
  return useQuery({
    queryKey: ['packs', 'with-counts'],
    queryFn: async () => {
      const response = await fetch('/api/packs?include=track_count');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch packs');
      }
      return response.json() as Promise<PackWithCount[]>;
    },
  });
}

/**
 * Fetch a single pack by ID.
 *
 * GET /api/packs/[id]
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
      return response.json() as Promise<Pack>;
    },
    enabled: !!packId,
  });
}

/**
 * Fetch tracks for a specific pack.
 *
 * GET /api/packs/[id]/tracks
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
