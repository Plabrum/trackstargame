/**
 * Get Spotify access token from cookies
 * Automatically refreshes token if expired
 */

import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/spotify-auth-actions';

export async function GET() {
  const { accessToken, error } = await getValidToken();

  if (!accessToken || error) {
    return NextResponse.json(
      { error: error || 'Not authenticated' },
      { status: 401 }
    );
  }

  return NextResponse.json({ accessToken });
}
