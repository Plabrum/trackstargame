/**
 * Unified Spotify Auth Context
 * Strictly for authenticated contexts - requires non-null user
 * Handle authentication checks and redirects BEFORE using this provider
 */

'use client';

import { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';

export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images?: { url: string }[];
}

export interface SpotifyAuthState {
  /** Current authenticated user (always non-null within this context) */
  user: SpotifyUser;
  /** Spotify access token for API calls and Web Playback SDK */
  accessToken: string;
  /** Log out and clear auth */
  logout: () => Promise<void>;
}

const SpotifyAuthContext = createContext<SpotifyAuthState | null>(null);

export interface SpotifyAuthProviderProps {
  /** Authenticated user data from server (must be non-null) */
  user: SpotifyUser;
  /** Spotify access token for API calls and Web Playback SDK */
  accessToken: string;
  /** Child components */
  children: React.ReactNode;
}

/**
 * Unified Spotify Auth Provider
 *
 * IMPORTANT: Only use this provider in authenticated contexts.
 * The user must be authenticated before this provider is rendered.
 * Handle auth checks and redirects in your layout/page before using this.
 *
 * @example
 * ```tsx
 * export default async function Layout({ children }) {
 *   const { user } = await getAuthenticatedUser();
 *
 *   if (!user) {
 *     redirect('/'); // Redirect BEFORE rendering provider
 *   }
 *
 *   return (
 *     <SpotifyAuthProvider user={user}>
 *       {children}
 *     </SpotifyAuthProvider>
 *   );
 * }
 * ```
 */
export function SpotifyAuthProvider({
  user,
  accessToken,
  children,
}: SpotifyAuthProviderProps) {
  /**
   * Log out and clear authentication
   */
  const logout = useCallback(async () => {
    try {
      // Clear server-side cookies via API route
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Logout request failed');
      }
    } catch (error) {
      console.error('[SpotifyAuth] Logout failed:', error);

      // Show error toast to user
      toast.error('Logout failed', {
        description: 'Failed to clear your session. Please try again.',
      });

      // Don't redirect if logout failed
      return;
    }

    // Only redirect if logout succeeded
    window.location.href = '/';
  }, []);

  const value: SpotifyAuthState = {
    user,
    accessToken,
    logout,
  };

  return (
    <SpotifyAuthContext.Provider value={value}>
      {children}
    </SpotifyAuthContext.Provider>
  );
}

/**
 * Hook to access Spotify auth state and methods
 * User is guaranteed to be non-null since this provider only renders in authenticated contexts
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, logout } = useSpotifyAuth();
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.display_name}!</p>
 *       <button onClick={logout}>Log out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpotifyAuth(): SpotifyAuthState {
  const context = useContext(SpotifyAuthContext);
  if (!context) {
    throw new Error('useSpotifyAuth must be used within SpotifyAuthProvider');
  }
  return context;
}

/**
 * Hook to access the current Spotify user (convenience wrapper)
 * User is guaranteed to be non-null since this provider only renders in authenticated contexts
 *
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const user = useSpotifyUser();
 *   return <p>Hello, {user.display_name}!</p>;
 * }
 * ```
 */
export function useSpotifyUser(): SpotifyUser {
  const { user } = useSpotifyAuth();
  return user;
}
