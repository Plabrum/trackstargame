// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/session/[id]/start
 *
 * Start the game (host only).
 * Requires at least 2 players.
 *
 * Response:
 * {
 *   success: boolean;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { isValidPlayerCount, getNextState } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session and verify it's in lobby state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state, current_round')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'lobby') {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      );
    }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (count === null || !isValidPlayerCount(count)) {
      return NextResponse.json(
        { error: `Need ${isValidPlayerCount(count || 0) ? '' : 'between 2 and 10'} players to start` },
        { status: 400 }
      );
    }

    // Update session state to 'playing' and set round to 1
    const newState = getNextState('lobby', 'start');
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        state: newState,
        current_round: 1,
      })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to start game:', updateError);
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

    // Broadcast state change and game started event
    await broadcastStateChange(sessionId, newState);
    await broadcastGameEvent(sessionId, {
      type: 'game_started',
      roundNumber: 1,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/session/[id]/start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
