/**
 * Buzz Action API
 *
 * POST /api/sessions/[id]/rounds/current/buzz - Player buzzes in
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/sessions/[id]/rounds/current/buzz
 * Player buzzes in during current round
 *
 * Request: { playerId: string }
 * Response: Updated round with buzzer info
 */
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

    // Get session to verify state and get current round
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state, current_round, round_start_time')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Validate game state
    if (session.state !== 'playing') {
      return NextResponse.json(
        { error: 'Cannot buzz when game is not playing' },
        { status: 400 }
      );
    }

    if (!session.round_start_time) {
      return NextResponse.json(
        { error: 'Round has not started yet' },
        { status: 400 }
      );
    }

    // Get current round to check if someone already buzzed
    const currentRoundNum = session.current_round || 0;
    const { data: currentRound, error: roundError } = await supabase
      .from('game_rounds')
      .select('buzzer_player_id')
      .eq('session_id', sessionId)
      .eq('round_number', currentRoundNum)
      .single();

    if (roundError) {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    if (currentRound.buzzer_player_id) {
      return NextResponse.json(
        { error: 'Someone already buzzed' },
        { status: 400 }
      );
    }

    // Calculate elapsed time
    const elapsedMs = Date.now() - new Date(session.round_start_time).getTime();
    const elapsedSeconds = elapsedMs / 1000;

    // Update round with buzzer info
    const roundNum = session.current_round || 0;
    const { data: updatedRound, error: updateError } = await supabase
      .from('game_rounds')
      .update({
        buzzer_player_id: playerId,
        elapsed_seconds: elapsedSeconds,
      })
      .eq('session_id', sessionId)
      .eq('round_number', roundNum)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Update session state to buzzed
    await supabase
      .from('game_sessions')
      .update({ state: 'buzzed' })
      .eq('id', sessionId);

    return NextResponse.json(updatedRound);
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/rounds/current/buzz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
