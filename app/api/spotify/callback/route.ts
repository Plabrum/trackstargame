/**
 * Spotify OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyTokens, setSpotifyTokenCookies } from '@/lib/spotify-auth';
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
    setSpotifyTokenCookies(tokens, cookieStore);

    console.log('[Spotify Callback] Cookies set, redirecting to select pack page');

    // Use client-side redirect with minimal delay to ensure cookies are set
    // The /host page has loading.tsx which will show skeletons immediately
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Redirecting...</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
            }
          </style>
        </head>
        <body>
          <script>
            // Immediate redirect - loading.tsx will handle the loading state
            window.location.href = '/host';
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[Spotify Callback] Token exchange failed:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}
