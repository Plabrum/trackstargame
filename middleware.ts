/**
 * Next.js Middleware for Spotify Token Refresh
 *
 * Automatically refreshes expired Spotify access tokens before requests
 * reach protected routes. This ensures tokens are always fresh when
 * server components try to use them.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshSpotifyToken } from './lib/spotify-auth';

/**
 * Refresh buffer to avoid edge cases where token expires during request
 * Tokens will be refreshed 5 minutes before actual expiration
 */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a JWT token is expired (or close to expiring) by decoding it
 */
function isTokenExpired(token: string): boolean {
  try {
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
    if (!payload.exp) return true;

    return payload.exp * 1000 - REFRESH_BUFFER_MS < Date.now();
  } catch (error) {
    console.error('[Middleware] Failed to decode token:', error);
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;

  // If no access token but have refresh token, try to refresh
  // If access token exists and is expired, try to refresh
  const needsRefresh = (!accessToken && refreshToken) ||
                       (accessToken && refreshToken && isTokenExpired(accessToken));

  if (needsRefresh && refreshToken) {
    try {
      console.log('[Middleware] Refreshing expired token...');
      const tokens = await refreshSpotifyToken(refreshToken);

      // Create response and set new cookies
      const response = NextResponse.next();

      response.cookies.set('spotify_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in,
      });

      if (tokens.refresh_token) {
        response.cookies.set('spotify_refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }

      console.log('[Middleware] Token refreshed successfully');
      return response;
    } catch (error) {
      console.error('[Middleware] Token refresh failed:', error);

      // Redirect to home with error
      const url = new URL('/', request.url);
      url.searchParams.set('error', 'refresh_failed');

      const response = NextResponse.redirect(url);

      // Clear invalid cookies
      response.cookies.delete('spotify_access_token');
      response.cookies.delete('spotify_refresh_token');

      return response;
    }
  }

  // No refresh needed, continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Only match /host routes (protected routes that need Spotify auth)
     * Don't run on API routes, static files, or other pages
     */
    '/host/:path*',
  ],
};
