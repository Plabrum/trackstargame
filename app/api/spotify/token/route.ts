/**
 * Get Spotify access token from cookies
 * Automatically refreshes token if expired
 */

import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/spotify-auth-actions';

export async function GET() {
  const { accessToken, error } = await getAccessToken();

  if (!accessToken || error) {
    return NextResponse.json(
      { error: error || 'Not authenticated' },
      { status: 401 }
    );
  }

  return NextResponse.json({ accessToken });
}
