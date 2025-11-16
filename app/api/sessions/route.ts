/**
 * Sessions API
 *
 * GET  /api/sessions - List sessions
 * POST /api/sessions - Create new session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { SupabaseSingleResponse } from '@/lib/types/supabase';

/**
 * GET /api/sessions
 * List all sessions (for debugging/admin)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();
    let query = supabase
      .from('game_sessions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state) {
      query = query.eq('state', state);
    }

    const { data: sessions, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sessions: sessions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Create a new game session
 *
 * Request: { packId: string }
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
      .select('*')
      .single()) as SupabaseSingleResponse<any>;

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
