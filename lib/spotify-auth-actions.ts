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
 * Refresh buffer to avoid edge cases where token expires during request
 * Tokens will be refreshed 5 minutes before actual expiration
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * In-flight refresh promise to prevent race conditions
 * If multiple requests try to refresh simultaneously, they'll reuse this promise
 */
let refreshPromise: Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> | null = null;

/**
 * Check if a JWT token is expired (or close to expiring) by decoding it
 * Spotify access tokens are JWTs with standard expiration claims
 */
function isTokenExpired(token: string): boolean {
  try {
    // Decode JWT payload (second part of token)
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    // Check if token has expired (exp is in seconds, Date.now() is in ms)
    if (!payload.exp) return true;

    // Refresh slightly before actual expiration to avoid edge cases
    const isExpired = payload.exp * 1000 - REFRESH_BUFFER_MS < Date.now();
    console.log('[isTokenExpired]', {
      exp: new Date(payload.exp * 1000).toISOString(),
      now: new Date().toISOString(),
      bufferMinutes: REFRESH_BUFFER_MS / 60000,
      isExpired,
    });

    return isExpired;
  } catch (error) {
    console.error('[isTokenExpired] Failed to decode token:', error);
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Ensure we have a valid access token, refreshing if necessary
 * Single source of truth for token validation and refresh
 */
async function ensureValidToken(): Promise<{
  accessToken: string | null;
  error?: string;
}> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  console.log('[ensureValidToken] Checking tokens:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  // No tokens at all
  if (!accessToken && !refreshToken) {
    return { accessToken: null, error: 'not_authenticated' };
  }

  // Have access token - check if it's expired
  if (accessToken) {
    if (!isTokenExpired(accessToken)) {
      // Token is still valid
      return { accessToken };
    }

    // Token expired - try to refresh
    console.log('[ensureValidToken] Access token expired, attempting refresh...');
    if (refreshToken) {
      const refreshResult = await refreshAccessToken(refreshToken);
      if (refreshResult.success && refreshResult.accessToken) {
        return { accessToken: refreshResult.accessToken };
      }
      return { accessToken: null, error: 'refresh_failed' };
    }

    // No refresh token available
    return { accessToken: null, error: 'token_expired' };
  }

  // No access token but have refresh token
  if (refreshToken) {
    console.log('[ensureValidToken] No access token, attempting refresh...');
    const refreshResult = await refreshAccessToken(refreshToken);
    if (refreshResult.success && refreshResult.accessToken) {
      return { accessToken: refreshResult.accessToken };
    }
    return { accessToken: null, error: 'refresh_failed' };
  }

  return { accessToken: null, error: 'not_authenticated' };
}

/**
 * Get the current authenticated Spotify user
 * Automatically refreshes token if expired
 */
export async function getAuthenticatedUser(): Promise<{
  user: SpotifyUser | null;
  error?: string;
}> {
  // Get a valid token (with auto-refresh)
  const { accessToken, error } = await ensureValidToken();

  if (!accessToken) {
    console.log('[getAuthenticatedUser] No valid token available:', { error });
    return { user: null, error };
  }

  // Fetch user with valid token
  return fetchSpotifyUser(accessToken);
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
 * Deduplicates concurrent refresh requests to prevent race conditions
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  // Reuse in-flight refresh request if one exists
  if (refreshPromise) {
    console.log('[refreshAccessToken] Reusing in-flight refresh request');
    return refreshPromise;
  }

  // Create new refresh promise
  refreshPromise = (async () => {
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
    } finally {
      // Clear promise after completion (success or failure)
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
  // Use shared token validation logic
  return ensureValidToken();
}
