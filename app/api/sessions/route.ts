/**
 * Sessions API
 *
 * POST /api/sessions - Create new session (requires Spotify auth)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/sessions
 * Create a new game session
 *
 * Requires Spotify authentication via httpOnly cookies.
 * This endpoint validates the host's Spotify token and creates a game session.
 *
 * Request: { packId: string, totalRounds?: number, allowHostToPlay?: boolean, allowSingleUser?: boolean, enableTextInputMode?: boolean }
 * Response: { id, code, host_name, pack_id, state, current_round, ... }
 */
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
    const {
      packId,
      totalRounds = 10,
      allowHostToPlay = false,
      allowSingleUser = false,
      enableTextInputMode = false,
    } = body;

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

    // Create game session with settings
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        host_name: hostName,
        pack_id: packId,
        state: 'lobby',
        current_round: 0,
        total_rounds: totalRounds,
        allow_host_to_play: allowHostToPlay,
        allow_single_user: allowSingleUser,
        enable_text_input_mode: enableTextInputMode,
      })
      .select('*')
      .single();

    if (sessionError || !gameSession) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json(gameSession);
  } catch (error) {
    console.error('Error in POST /api/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
