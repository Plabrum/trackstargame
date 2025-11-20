/**
 * Spotify Auth Server Actions
 * Server-side actions for authentication and token management
 *
 * Note: Token refresh is handled by middleware.ts to avoid cookie-setting issues
 */

'use server';

import { cookies } from 'next/headers';

export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images?: { url: string }[];
}

/**
 * Note: Token refresh is now handled by middleware.ts
 * This ensures tokens are always fresh before requests reach server components
 */

/**
 * Get the access token from cookies
 * Middleware ensures it's always fresh, so we just read it
 */
async function getValidToken(): Promise<{
  accessToken: string | null;
  error?: string;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  console.log('[getValidToken] Checking tokens:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  // No tokens at all
  if (!accessToken && !refreshToken) {
    return { accessToken: null, error: 'not_authenticated' };
  }

  // Have access token (middleware ensures it's fresh)
  if (accessToken) {
    return { accessToken };
  }

  // No access token but have refresh token means middleware failed to refresh
  if (refreshToken) {
    return { accessToken: null, error: 'refresh_failed' };
  }

  return { accessToken: null, error: 'not_authenticated' };
}

/**
 * Get the current authenticated Spotify user
 * Middleware ensures token is fresh before this is called
 */
export async function getAuthenticatedUser(): Promise<{
  user: SpotifyUser | null;
  accessToken?: string;
  error?: string;
}> {
  // Get token (middleware already refreshed if needed)
  const { accessToken, error } = await getValidToken();

  if (!accessToken) {
    console.log('[getAuthenticatedUser] No valid token available:', { error });
    return { user: null, error };
  }

  // Fetch user with valid token
  const result = await fetchSpotifyUser(accessToken);
  return {
    ...result,
    accessToken, // Include access token for client-side use (e.g., Web Playback SDK)
  };
}

/**
 * Fetch Spotify user profile with given access token
 */
async function fetchSpotifyUser(accessToken: string): Promise<{
  user: SpotifyUser | null;
  error?: string;
}> {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    console.log('[fetchSpotifyUser] Spotify API response:', {
      ok: response.ok,
      status: response.status,
    });

    if (response.status === 401) {
      return { user: null, error: 'token_expired' };
    }

    if (!response.ok) {
      return { user: null, error: 'api_error' };
    }

    const user = await response.json();
    console.log('[fetchSpotifyUser] User fetched successfully:', {
      id: user.id,
      email: user.email,
    });

    return { user };
  } catch (error) {
    console.error('[fetchSpotifyUser] Failed to fetch user:', error);
    return { user: null, error: 'network_error' };
  }
}

/**
 * Clear Spotify authentication cookies (logout)
 */
export async function clearSpotifyAuth() {
  const cookieStore = await cookies();
  cookieStore.delete('spotify_access_token');
  cookieStore.delete('spotify_refresh_token');
}

/**
 * Get access token for client-side use (e.g., Web Playback SDK)
 * Middleware ensures it's fresh
 */
export async function getAccessToken(): Promise<{
  accessToken: string | null;
  error?: string;
}> {
  // Use shared token validation logic
  return getValidToken();
}
