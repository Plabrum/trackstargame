// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/next-round
 *
 * Advance to next round or finish game (host only).
 *
 * Response:
 * {
 *   state: 'playing' | 'finished';
 *   roundNumber?: number; // if advancing
 *   leaderboard?: Array; // if finished
 *   winner?: { playerId, playerName, score }; // if finished
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { getNextState, GAME_CONFIG } from '@/lib/game/state-machine';

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
      .select('state, current_round')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'reveal') {
      return NextResponse.json(
        { error: 'Can only advance from reveal state' },
        { status: 400 }
      );
    }

    // Determine if this is the last round
    const isLastRound = session.current_round >= GAME_CONFIG.TOTAL_ROUNDS;

    if (isLastRound) {
      // Game is finished
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ state: 'finished' })
        .eq('id', sessionId) as { error: any };

      if (updateError) {
        console.error('Failed to finish game:', updateError);
        return NextResponse.json(
          { error: 'Failed to finish game' },
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
        score: p.score,
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
    }

    // Advance to next round
    const nextRound = session.current_round + 1;
    const newState = getNextState(
      session.state as any,
      'next_round',
      { currentRound: session.current_round }
    );

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        state: newState,
        current_round: nextRound,
        round_start_time: null, // Reset for new round
      })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to advance round:', updateError);
      return NextResponse.json(
        { error: 'Failed to advance round' },
        { status: 500 }
      );
    }

    // Broadcast state change
    await broadcastStateChange(sessionId, newState);

    return NextResponse.json({
      state: newState,
      roundNumber: nextRound,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/next-round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
