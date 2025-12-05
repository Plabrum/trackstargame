import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/spotify-auth-actions';

/**
 * Save a track to the user's Spotify library
 * PUT /api/spotify/save-track
 */
export async function PUT(request: Request) {
  try {
    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user's access token
    const { accessToken, error } = await getValidToken();

    if (error || !accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Spotify' },
        { status: 401 }
      );
    }

    // Save track to user's library using Spotify Web API
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?ids=${trackId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Spotify API error:', errorData);

      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to save track to Spotify' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving track:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
