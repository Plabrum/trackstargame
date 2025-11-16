/**
 * POST /api/game/[id]/end
 *
 * End the game early (host only).
 * Transitions game to 'finished' state and broadcasts game end event.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { getNextState, validateGameState } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Can't end a game that's already finished
    const gameState = validateGameState(session.state);
    if (gameState === 'finished') {
      return NextResponse.json(
        { error: 'Game is already finished' },
        { status: 400 }
      );
    }

    // Update to finished state using state machine
    const newState = getNextState(gameState, 'finish');
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to end game:', updateError);
      return NextResponse.json(
        { error: 'Failed to end game' },
        { status: 500 }
      );
    }

    // Get final leaderboard
    const { data: players } = await supabase
      .from('players')
      .select('id, name, score')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    const leaderboard = players?.map(p => ({
      playerId: p.id,
      playerName: p.name,
      score: p.score ?? 0,
    })) || [];

    const winner = leaderboard[0] || null;

    // Broadcast game end event
    await broadcastStateChange(sessionId, 'finished');
    await broadcastGameEvent(sessionId, {
      type: 'game_end',
      leaderboard,
      winner,
    });

    return NextResponse.json({
      state: 'finished',
      leaderboard,
      winner,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/end:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
