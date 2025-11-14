/**
 * GET /api/session/[id]
 *
 * Get current session state, players, and scores.
 *
 * Response:
 * {
 *   session: {
 *     id: string;
 *     host_name: string;
 *     pack_id: string;
 *     current_round: number;
 *     state: string;
 *     ...
 *   };
 *   players: Array<{
 *     id: string;
 *     name: string;
 *     score: number;
 *   }>;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all players with scores
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, score, joined_at')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    if (playersError) {
      console.error('Failed to fetch players:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      players: players || [],
    });
  } catch (error) {
    console.error('Error in GET /api/session/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
