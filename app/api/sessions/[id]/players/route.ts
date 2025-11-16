/**
 * Players Sub-Resource API
 *
 * GET  /api/sessions/[id]/players - List players
 * POST /api/sessions/[id]/players - Join session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/[id]/players
 * List all players in a session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'score';
    const order = searchParams.get('order') || 'desc';

    const supabase = await createClient();

    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order(sort, { ascending: order === 'asc' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/players:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/players
 * Join a session as a player
 *
 * Request: { playerName: string }
 * Response: { id, name, score, session_id, joined_at }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { playerName } = body;

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'playerName is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify session exists and is in lobby state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.state !== 'lobby') {
      return NextResponse.json(
        { error: 'Cannot join: game has already started' },
        { status: 400 }
      );
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        session_id: sessionId,
        name: playerName.trim(),
        score: 0,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Failed to create player:', playerError);
      return NextResponse.json(
        { error: 'Failed to join session' },
        { status: 500 }
      );
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/players:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
