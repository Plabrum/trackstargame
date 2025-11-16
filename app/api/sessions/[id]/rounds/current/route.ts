/**
 * Current Round API
 *
 * GET   /api/sessions/[id]/rounds/current - Get current round
 * PATCH /api/sessions/[id]/rounds/current - Update current round (start, judge, reveal)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/[id]/rounds/current
 * Get the current round details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session to find current round number
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('current_round')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get the current round
    const currentRound = session.current_round || 0;
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .eq('round_number', currentRound)
      .single();

    if (roundError) {
      return NextResponse.json(
        { error: 'Current round not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/rounds/current:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]/rounds/current
 * Update current round state
 *
 * Actions:
 * - "start": Start the round (set round_start_time)
 * - "judge": Judge the answer (correct: boolean)
 * - "reveal": Reveal the track
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

    // Get session to find current round
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('current_round, state')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start': {
        // Start the current round
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({
            round_start_time: new Date().toISOString(),
            state: 'playing',
          })
          .eq('id', sessionId);

        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }

        // Return updated session
        const { data: updatedSession } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        return NextResponse.json(updatedSession);
      }

      case 'judge': {
        const { correct } = body;

        if (typeof correct !== 'boolean') {
          return NextResponse.json(
            { error: 'correct (boolean) is required' },
            { status: 400 }
          );
        }

        // Get current round
        const judgeRoundNum = session.current_round || 0;
        const { data: round, error: roundError } = await supabase
          .from('game_rounds')
          .select('buzzer_player_id, elapsed_seconds')
          .eq('session_id', sessionId)
          .eq('round_number', judgeRoundNum)
          .single();

        if (roundError || !round || !round.buzzer_player_id) {
          return NextResponse.json(
            { error: 'No buzzer to judge' },
            { status: 400 }
          );
        }

        // Calculate points (100 base, -10 per second elapsed, min 10)
        const elapsedSeconds = Number(round.elapsed_seconds) || 0;
        const pointsAwarded = correct
          ? Math.max(10, 100 - Math.floor(elapsedSeconds) * 10)
          : 0;

        // Update round with judgement
        await supabase
          .from('game_rounds')
          .update({
            was_correct: correct,
            points_awarded: pointsAwarded,
          })
          .eq('session_id', sessionId)
          .eq('round_number', judgeRoundNum);

        // Update player score if correct
        if (correct) {
          const { data: player } = await supabase
            .from('players')
            .select('score')
            .eq('id', round.buzzer_player_id)
            .single();

          if (player) {
            await supabase
              .from('players')
              .update({
                score: (player.score || 0) + pointsAwarded,
              })
              .eq('id', round.buzzer_player_id);
          }
        }

        // Update session state to reveal
        await supabase
          .from('game_sessions')
          .update({ state: 'reveal' })
          .eq('id', sessionId);

        // Return updated round
        const { data: updatedRound } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('session_id', sessionId)
          .eq('round_number', judgeRoundNum)
          .single();

        return NextResponse.json(updatedRound);
      }

      case 'reveal': {
        // Reveal track (no buzzer)
        await supabase
          .from('game_sessions')
          .update({ state: 'reveal' })
          .eq('id', sessionId);

        const { data: updatedSession } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        return NextResponse.json(updatedSession);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "start", "judge", or "reveal"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PATCH /api/sessions/[id]/rounds/current:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
