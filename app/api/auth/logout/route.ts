/**
 * POST /api/auth/logout
 *
 * Clears Spotify authentication cookies
 */

import { NextResponse } from 'next/server';
import { clearSpotifyAuth } from '@/lib/spotify-user';

export async function POST() {
  await clearSpotifyAuth();
  return NextResponse.json({ success: true });
}
