/**
 * POST /api/session/create
 *
 * Create a new game session (requires Spotify authentication).
 *
 * Request body:
 * {
 *   packId: string;
 * }
 *
 * Response:
 * {
 *   sessionId: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { SupabaseSingleResponse } from '@/lib/types/supabase';

export async function POST(request: Request) {
  try {
    // Verify host is authenticated with Spotify
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Host must be authenticated with Spotify' },
        { status: 401 }
      );
    }

    // Fetch user info from Spotify
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify Spotify authentication' },
        { status: 401 }
      );
    }

    const spotifyUser = await userResponse.json();

    const body = await request.json();
    const { packId } = body;

    if (!packId) {
      return NextResponse.json(
        { error: 'packId is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's name as host name
    const hostName = spotifyUser.display_name || spotifyUser.email || 'Host';

    // Verify pack exists
    const supabase = await createClient();
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    // Create game session
    const { data: gameSession, error: sessionError } = (await supabase
      .from('game_sessions')
      .insert({
        host_name: hostName,
        pack_id: packId,
        state: 'lobby',
        current_round: 0,
      })
      .select('id')
      .single()) as SupabaseSingleResponse<{ id: string }>;

    if (sessionError || !gameSession) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: gameSession.id,
    });
  } catch (error) {
    console.error('Error in /api/session/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
