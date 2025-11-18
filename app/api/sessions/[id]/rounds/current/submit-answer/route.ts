/**
 * Submit Answer API
 *
 * POST /api/sessions/[id]/rounds/current/submit-answer - Player submits an answer (text input mode)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextGameState } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState } from '@/lib/game/state-machine';
import { fuzzyMatch } from '@/lib/game/fuzzy-match';
import { calculatePoints } from '@/lib/game/state-machine';

/**
 * POST /api/sessions/[id]/rounds/current/submit-answer
 * Player submits an answer in text input mode
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { playerId, answer } = body;

    if (!playerId || !answer) {
      return NextResponse.json(
        { error: 'Missing playerId or answer' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify text input mode is enabled
    if (!session.enable_text_input_mode) {
      return NextResponse.json(
        { error: 'Text input mode is not enabled for this session' },
        { status: 400 }
      );
    }

    const currentState = validateGameState(session.state);

    // Verify we're in playing state
    if (currentState !== 'playing') {
      return NextResponse.json(
        { error: 'Can only submit answers during playing state' },
        { status: 400 }
      );
    }

    if (!session.round_start_time) {
      return NextResponse.json(
        { error: 'Round has not started yet' },
        { status: 400 }
      );
    }

    // Get current round
    const currentRoundNum = session.current_round || 0;
    const { data: currentRound, error: roundError } = await supabase
      .from('game_rounds')
      .select('id, track_id')
      .eq('session_id', sessionId)
      .eq('round_number', currentRoundNum)
      .single();

    if (roundError || !currentRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if player already submitted
    const { data: existingAnswer } = await supabase
      .from('round_answers')
      .select('id')
      .eq('round_id', currentRound.id)
      .eq('player_id', playerId)
      .single();

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'You have already submitted an answer for this round' },
        { status: 400 }
      );
    }

    // Verify round has a track assigned
    if (!currentRound.track_id) {
      return NextResponse.json({ error: 'Round has no track assigned' }, { status: 500 });
    }

    // Get track details for validation
    const { data: track } = await supabase
      .from('tracks')
      .select('artist')
      .eq('id', currentRound.track_id)
      .single();

    if (!track || !track.artist) {
      return NextResponse.json({ error: 'Track not found' }, { status: 500 });
    }

    // Auto-validate answer using fuzzy matching
    const autoValidated = fuzzyMatch(answer, track.artist, 80);

    // Calculate elapsed time
    const elapsedMs = Date.now() - new Date(session.round_start_time).getTime();
    const elapsedSeconds = elapsedMs / 1000;

    // Calculate points if correct (will be finalized later in multiplayer, or immediately in single player)
    const potentialPoints = autoValidated ? calculatePoints(elapsedSeconds, true) : 0;

    // Insert answer
    const { data: submittedAnswer, error: insertError } = await supabase
      .from('round_answers')
      .insert({
        round_id: currentRound.id,
        player_id: playerId,
        submitted_answer: answer,
        auto_validated: autoValidated,
        is_correct: autoValidated, // Initially set to auto_validated, can be overridden by host
        points_awarded: potentialPoints,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Check if all players have submitted
    const { count: totalPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const { count: submittedCount } = await supabase
      .from('round_answers')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', currentRound.id);

    const allPlayersSubmitted = submittedCount === totalPlayers;

    // If single player mode and answer submitted, auto-finalize and advance
    if (session.allow_single_user && allPlayersSubmitted) {
      // Award points immediately
      if (autoValidated) {
        await supabase.rpc('increment_player_score', {
          player_id: playerId,
          points: potentialPoints,
        });
      }

      // Update round with final result
      await supabase
        .from('game_rounds')
        .update({
          correct: autoValidated,
          points_awarded: potentialPoints,
        })
        .eq('id', currentRound.id);

      // Transition to reveal state (use 'judge' action for solo mode)
      const nextState = getNextGameState(currentState, 'judge');
      await supabase
        .from('game_sessions')
        .update({ state: nextState })
        .eq('id', sessionId);

      await broadcastStateChange(sessionId, nextState);

      // Return immediate feedback for single player
      return NextResponse.json({
        ...submittedAnswer,
        isCorrect: autoValidated,
        correctAnswer: track.artist,
        pointsEarned: potentialPoints,
        allPlayersSubmitted: true,
        singlePlayerMode: true,
      });
    }

    // In multiplayer mode, check if all players submitted
    if (allPlayersSubmitted) {
      // Transition to submitted state for host review
      const nextState = getNextGameState(currentState, 'submit');
      await supabase
        .from('game_sessions')
        .update({ state: nextState })
        .eq('id', sessionId);

      await broadcastGameEvent(sessionId, {
        type: 'all_answers_submitted',
        roundNumber: currentRoundNum,
      });

      await broadcastStateChange(sessionId, nextState);
    }

    return NextResponse.json({
      ...submittedAnswer,
      allPlayersSubmitted,
      singlePlayerMode: false,
    });
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/rounds/current/submit-answer:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
