/**
 * Session Resource API
 *
 * GET   /api/sessions/[id] - Get session details
 * PATCH /api/sessions/[id] - Update session state
 * DELETE /api/sessions/[id] - Delete session
 *
 * Query params for GET:
 * ?include=players,rounds,pack - Include related resources
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/[id]
 * Fetch session with optional includes
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    const supabase = await createClient();

    // Fetch base session
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result: any = { ...session };

    // Conditionally include related resources
    if (include.includes('players')) {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      result.players = players || [];
    }

    if (include.includes('rounds')) {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true });

      result.rounds = rounds || [];
    }

    if (include.includes('pack') && session.pack_id) {
      const { data: pack } = await supabase
        .from('packs')
        .select('*')
        .eq('id', session.pack_id)
        .single();

      result.pack = pack;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update session state
 *
 * Request: { action: "start" | "end" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { action } = body;

    const supabase = await createClient();

    switch (action) {
      case 'start': {
        // Start game - transition from lobby to playing
        const { data: session, error } = await supabase
          .from('game_sessions')
          .update({ state: 'playing', current_round: 1 })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(session);
      }

      case 'end': {
        // End game - transition to finished
        const { data: session, error } = await supabase
          .from('game_sessions')
          .update({ state: 'finished' })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(session);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "start" or "end"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PATCH /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session (cleanup)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
