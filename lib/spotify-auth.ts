/**
 * Simple Spotify OAuth implementation
 * No complicated auth libraries - just direct OAuth flow
 */

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'https://localhost:3000/api/spotify/callback';

const SCOPES = [
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-modify', // Save tracks to user's library
];

/**
 * Generate the Spotify authorization URL
 */
export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function getSpotifyTokens(code: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify tokens');
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Spotify token');
  }

  return response.json();
}

/**
 * Cookie store interface compatible with both Next.js cookies() and NextResponse.cookies
 */
interface CookieStore {
  set(name: string, value: string, options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
  }): void;
}

/**
 * Spotify token response structure
 */
export interface SpotifyTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Set Spotify authentication cookies with standardized configuration
 * Works with both server-side cookies() and middleware NextResponse.cookies
 *
 * @param tokens - Spotify tokens from OAuth flow or refresh
 * @param cookieStore - Cookie store (from cookies() or NextResponse.cookies)
 */
export function setSpotifyTokenCookies(tokens: SpotifyTokens, cookieStore: CookieStore): void {
  // Calculate expiration timestamp
  const expiresAtTimestamp = Date.now() + tokens.expires_in * 1000;

  // Set access token
  cookieStore.set('spotify_access_token', tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokens.expires_in,
  });

  // Set expiration timestamp
  cookieStore.set('spotify_token_expires_at', expiresAtTimestamp.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokens.expires_in,
  });

  // Set refresh token (if provided)
  if (tokens.refresh_token) {
    cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}
