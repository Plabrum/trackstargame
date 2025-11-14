/**
 * Spotify user utilities
 */

import { cookies } from 'next/headers';

export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images?: { url: string }[];
}

/**
 * Get the current authenticated Spotify user
 */
export async function getSpotifyUser(): Promise<SpotifyUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;

  console.log('[getSpotifyUser] Checking for access token:', { hasToken: !!accessToken });

  if (!accessToken) {
    console.log('[getSpotifyUser] No access token found in cookies');
    return null;
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('[getSpotifyUser] Spotify API response:', { ok: response.ok, status: response.status });

    if (!response.ok) {
      console.error('[getSpotifyUser] Spotify API error:', response.status);
      return null;
    }

    const user = await response.json();
    console.log('[getSpotifyUser] User fetched successfully:', { id: user.id, email: user.email });
    return user;
  } catch (error) {
    console.error('[getSpotifyUser] Failed to fetch Spotify user:', error);
    return null;
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
