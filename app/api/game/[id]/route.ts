/**
 * GET /api/game/[id]
 *
 * Fetch a game session by ID.
 *
 * Response:
 * {
 *   id: string;
 *   code: string;
 *   state: GameState;
 *   current_round: number;
 *   round_start_time: string | null;
 *   pack_id: string;
 *   host_id: string | null;
 *   created_at: string;
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

    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error in GET /api/game/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
