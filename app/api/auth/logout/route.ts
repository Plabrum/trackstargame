/**
 * Logout API
 *
 * POST /api/auth/logout - Clear Spotify authentication cookies
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/logout
 * Clear Spotify authentication cookies and log out the user
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('spotify_access_token');
    cookieStore.delete('spotify_refresh_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
