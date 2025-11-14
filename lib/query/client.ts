/**
 * TanStack Query client configuration for trackstargame.
 *
 * This client handles all data fetching, caching, and synchronization
 * with Supabase backend and real-time updates.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered "fresh"
      staleTime: 1000 * 60, // 1 minute

      // Cache time: how long inactive data stays in cache
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)

      // Retry configuration
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on window focus (we have real-time)
      refetchOnReconnect: true, // Do refetch when coming back online
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
