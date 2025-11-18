/**
 * Current Round API
 *
 * GET   /api/sessions/[id]/rounds/current - Get current round
 * PATCH /api/sessions/[id]/rounds/current - Update current round (judge, reveal)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextGameState, enforceJudgeRules, StateTransitionError, GameRuleError } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState, calculatePoints } from '@/lib/game/state-machine';

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
 * - "judge": Judge the answer (correct: boolean)
 * - "reveal": Reveal the track
 * - "finalize": Finalize judgments after all answers submitted (text input mode)
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

    const currentState = validateGameState(session.state);

    switch (action) {
      case 'judge': {
        const { correct } = body;

        if (typeof correct !== 'boolean') {
          return NextResponse.json(
            { error: 'correct (boolean) is required' },
            { status: 400 }
          );
        }

        try {
          // Enforce game rules
          enforceJudgeRules(session);

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

          // Calculate points using state machine formula (30 max, -10 penalty)
          const elapsedSeconds = Number(round.elapsed_seconds) || 0;
          const pointsAwarded = calculatePoints(elapsedSeconds, correct);

          console.log('[Judge] Elapsed seconds:', elapsedSeconds);
          console.log('[Judge] Points awarded:', pointsAwarded);
          console.log('[Judge] Correct:', correct);

          // Update round with judgement (fixed field name: correct not was_correct)
          await supabase
            .from('game_rounds')
            .update({
              correct: correct,
              points_awarded: Math.round(pointsAwarded),
            })
            .eq('session_id', sessionId)
            .eq('round_number', judgeRoundNum);

          // Update player score (works for both correct and incorrect due to penalty)
          const { data: player } = await supabase
            .from('players')
            .select('score')
            .eq('id', round.buzzer_player_id)
            .single();

          console.log('[Judge] Current player score:', player?.score);
          console.log('[Judge] New score will be:', (player?.score ?? 0) + pointsAwarded);

          if (player) {
            const newScore = Math.round((player.score ?? 0) + pointsAwarded);
            const { error: scoreUpdateError } = await supabase
              .from('players')
              .update({
                score: newScore,
              })
              .eq('id', round.buzzer_player_id);

            if (scoreUpdateError) {
              console.error('[Judge] Error updating score:', scoreUpdateError);
            } else {
              console.log('[Judge] Score updated successfully to:', newScore);
            }
          }

          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'judge');

          // Update session state to reveal
          await supabase
            .from('game_sessions')
            .update({ state: nextState })
            .eq('id', sessionId);

          // Broadcast round result event
          await broadcastGameEvent(sessionId, {
            type: 'round_result',
            playerId: round.buzzer_player_id,
            correct,
            pointsAwarded: Math.round(pointsAwarded),
          });

          await broadcastStateChange(sessionId, nextState);

          // Return updated round
          const { data: updatedRound } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('session_id', sessionId)
            .eq('round_number', judgeRoundNum)
            .single();

          return NextResponse.json(updatedRound);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      case 'reveal': {
        try {
          // Reveal track (timeout case - no buzzer)
          const nextState = getNextGameState(currentState, 'judge');

          // Get current round and track info
          const currentRoundNum = session.current_round || 0;
          const { data: round } = await supabase
            .from('game_rounds')
            .select('track_id, tracks(title, artist, spotify_id)')
            .eq('session_id', sessionId)
            .eq('round_number', currentRoundNum)
            .single();

          // Get leaderboard
          const { data: players } = await supabase
            .from('players')
            .select('id, name, score')
            .eq('session_id', sessionId)
            .order('score', { ascending: false });

          await supabase
            .from('game_sessions')
            .update({ state: nextState })
            .eq('id', sessionId);

          // Broadcast reveal event with track info
          const track = round?.tracks as any;
          if (track) {
            const leaderboard = (players || []).map(p => ({
              playerId: p.id,
              playerName: p.name,
              score: p.score ?? 0,
            }));

            await broadcastGameEvent(sessionId, {
              type: 'reveal',
              track: {
                title: track.title,
                artist: track.artist,
                spotify_id: track.spotify_id,
              },
              leaderboard,
            });
          }

          await broadcastStateChange(sessionId, nextState);

          const { data: updatedSession } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

          return NextResponse.json(updatedSession);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      case 'finalize': {
        try {
          // Finalize judgments after all answers submitted (text input mode)
          const { overrides } = body; // Record<player_id, boolean>

          // Get current round
          const finalizeRoundNum = session.current_round || 0;
          const { data: round, error: roundError } = await supabase
            .from('game_rounds')
            .select('id')
            .eq('session_id', sessionId)
            .eq('round_number', finalizeRoundNum)
            .single();

          if (roundError || !round) {
            return NextResponse.json(
              { error: 'Round not found' },
              { status: 400 }
            );
          }

          // Get all submitted answers for this round
          const { data: answers, error: answersError } = await supabase
            .from('round_answers')
            .select('*')
            .eq('round_id', round.id);

          if (answersError) {
            return NextResponse.json(
              { error: answersError.message },
              { status: 500 }
            );
          }

          // Apply overrides and award points
          for (const answer of answers || []) {
            // Check if host overrode this answer
            const finalJudgment = overrides?.[answer.player_id] ?? answer.auto_validated;

            // Update answer with final judgment
            await supabase
              .from('round_answers')
              .update({
                is_correct: finalJudgment,
              })
              .eq('id', answer.id);

            // Award/deduct points
            if (finalJudgment) {
              // Award points for correct answer
              await supabase.rpc('increment_player_score', {
                player_id: answer.player_id,
                points: answer.points_awarded ?? 0,
              });
            }
          }

          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'finalize');

          // Update session state to reveal
          await supabase
            .from('game_sessions')
            .update({ state: nextState })
            .eq('id', sessionId);

          // Get leaderboard
          const { data: players } = await supabase
            .from('players')
            .select('id, name, score')
            .eq('session_id', sessionId)
            .order('score', { ascending: false });

          const leaderboard = (players || []).map(p => ({
            playerId: p.id,
            playerName: p.name,
            score: p.score ?? 0,
          }));

          // Broadcast finalize event with results
          await broadcastGameEvent(sessionId, {
            type: 'answers_finalized',
            roundNumber: finalizeRoundNum,
            leaderboard,
          });

          await broadcastStateChange(sessionId, nextState);

          return NextResponse.json({ success: true, leaderboard });
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "judge", "reveal", or "finalize"' },
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
