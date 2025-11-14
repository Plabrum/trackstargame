// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/buzz
 *
 * Player buzzes in during a round.
 * Records timestamp and calculates elapsed time.
 * Implements atomic first-buzz-wins logic.
 *
 * Request body:
 * {
 *   playerId: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   elapsedSeconds: number;
 *   position: 'first' | 'too_late';
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { getNextState, canBuzz } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get session state and round start time
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state, round_start_time, current_round')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validate game state allows buzzing
    if (!canBuzz(session.state as any)) {
      return NextResponse.json(
        { error: 'Cannot buzz in current game state', state: session.state },
        { status: 400 }
      );
    }

    if (!session.round_start_time) {
      return NextResponse.json(
        { error: 'Round has not started' },
        { status: 400 }
      );
    }

    // Verify player exists in this session
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Calculate elapsed time
    const buzzTime = new Date();
    const startTime = new Date(session.round_start_time);
    const elapsedSeconds = (buzzTime.getTime() - startTime.getTime()) / 1000;

    // Atomic first-buzz-wins: Update game_rounds table
    // Only update if buzzer_player_id is NULL (no one has buzzed yet)
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('id, buzzer_player_id')
      .eq('session_id', sessionId)
      .eq('round_number', session.current_round)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if someone already buzzed
    if (round.buzzer_player_id) {
      return NextResponse.json({
        success: false,
        position: 'too_late',
        message: 'Someone already buzzed',
      });
    }

    // Atomic update: Only succeed if buzzer_player_id is still NULL
    const { error: updateRoundError } = await supabase
      .from('game_rounds')
      .update({
        buzzer_player_id: playerId,
        buzz_time: buzzTime.toISOString(),
        elapsed_seconds: elapsedSeconds,
      })
      .eq('id', round.id)
      .is('buzzer_player_id', null) as { error: any }; // Atomic check

    if (updateRoundError) {
      console.error('Failed to record buzz:', updateRoundError);
      return NextResponse.json({
        success: false,
        position: 'too_late',
        message: 'Someone buzzed at the same time',
      });
    }

    // Update session state to 'buzzed'
    const newState = getNextState(session.state as any, 'buzz');
    const { error: stateError } = await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', sessionId) as { error: any };

    if (stateError) {
      console.error('Failed to update game state:', stateError);
    }

    // Broadcast buzz event
    await broadcastStateChange(sessionId, newState);
    await broadcastGameEvent(sessionId, {
      type: 'buzz',
      playerId: player.id,
      playerName: player.name,
      elapsedSeconds,
    });

    return NextResponse.json({
      success: true,
      position: 'first',
      elapsedSeconds,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/buzz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
