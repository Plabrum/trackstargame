/**
 * Spotify OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyTokens } from '@/lib/spotify-auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('[Spotify Callback] Received callback:', { code: !!code, error });

  if (error) {
    console.error('[Spotify Callback] Spotify auth error:', error);
    return NextResponse.redirect(new URL('/?error=spotify_auth_failed', request.url));
  }

  if (!code) {
    console.error('[Spotify Callback] No code received');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // Exchange code for tokens
    console.log('[Spotify Callback] Exchanging code for tokens...');
    const tokens = await getSpotifyTokens(code);
    console.log('[Spotify Callback] Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });

    // Store tokens in secure HTTP-only cookies
    const cookieStore = await cookies();

    // Calculate expiration timestamp
    const expiresAtTimestamp = Date.now() + tokens.expires_in * 1000;

    cookieStore.set('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    // Store the expiration timestamp
    cookieStore.set('spotify_token_expires_at', expiresAtTimestamp.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('[Spotify Callback] Cookies set, returning HTML with client-side redirect');

    // Use client-side redirect because server-side redirects don't include
    // the Set-Cookie headers in the subsequent request
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Redirecting...</title>
        </head>
        <body>
          <p>Authenticating...</p>
          <script>
            window.location.href = '/host/select-pack';
          </script>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

    return response;
  } catch (error) {
    console.error('[Spotify Callback] Token exchange failed:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}
