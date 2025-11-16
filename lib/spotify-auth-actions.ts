/**
 * Spotify Auth Server Actions
 * Server-side actions for authentication and token management
 */

'use server';

import { cookies } from 'next/headers';
import { refreshSpotifyToken } from './spotify-auth';

export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images?: { url: string }[];
}

/**
 * Get the current authenticated Spotify user
 * Automatically refreshes token if expired
 */
export async function getAuthenticatedUser(): Promise<{
  user: SpotifyUser | null;
  error?: string;
}> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  console.log('[getAuthenticatedUser] Checking auth:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  if (!accessToken && !refreshToken) {
    console.log('[getAuthenticatedUser] No tokens found');
    return { user: null };
  }

  // Try to fetch user with current token
  if (accessToken) {
    const userResult = await fetchSpotifyUser(accessToken);
    if (userResult.user) {
      return userResult;
    }

    // Token might be expired, try refreshing if we have a refresh token
    if (userResult.error === 'token_expired' && refreshToken) {
      console.log('[getAuthenticatedUser] Access token expired, attempting refresh...');
      const refreshResult = await refreshAccessToken(refreshToken);

      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        // Try again with new token
        return fetchSpotifyUser(accessToken);
      } else {
        console.error('[getAuthenticatedUser] Token refresh failed:', refreshResult.error);
        return { user: null, error: 'refresh_failed' };
      }
    }

    return userResult;
  }

  // No access token but have refresh token - try to refresh
  if (refreshToken) {
    console.log('[getAuthenticatedUser] No access token, attempting refresh...');
    const refreshResult = await refreshAccessToken(refreshToken);

    if (refreshResult.success && refreshResult.accessToken) {
      return fetchSpotifyUser(refreshResult.accessToken);
    } else {
      console.error('[getAuthenticatedUser] Token refresh failed:', refreshResult.error);
      return { user: null, error: 'refresh_failed' };
    }
  }

  return { user: null };
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
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  try {
    console.log('[refreshAccessToken] Attempting to refresh token...');
    const tokens = await refreshSpotifyToken(refreshToken);

    console.log('[refreshAccessToken] Token refresh successful');

    // Update cookies with new access token
    const cookieStore = await cookies();

    cookieStore.set('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    // Update refresh token if a new one was provided
    if (tokens.refresh_token) {
      cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return { success: true, accessToken: tokens.access_token };
  } catch (error) {
    console.error('[refreshAccessToken] Token refresh failed:', error);
    return { success: false, error: 'refresh_failed' };
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
 * Automatically refreshes if expired
 */
export async function getAccessToken(): Promise<{
  accessToken: string | null;
  error?: string;
}> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    return { accessToken: null, error: 'not_authenticated' };
  }

  // If we have an access token, try to validate it
  if (accessToken) {
    // Quick validation - try to fetch user
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (response.ok) {
      return { accessToken };
    }

    // Token expired, try refresh
    if (response.status === 401 && refreshToken) {
      const refreshResult = await refreshAccessToken(refreshToken);
      if (refreshResult.success && refreshResult.accessToken) {
        return { accessToken: refreshResult.accessToken };
      }
    }

    return { accessToken: null, error: 'token_invalid' };
  }

  // No access token but have refresh token
  if (refreshToken) {
    const refreshResult = await refreshAccessToken(refreshToken);
    if (refreshResult.success && refreshResult.accessToken) {
      return { accessToken: refreshResult.accessToken };
    }
    return { accessToken: null, error: 'refresh_failed' };
  }

  return { accessToken: null, error: 'not_authenticated' };
}
