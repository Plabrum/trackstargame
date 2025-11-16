/**
 * POST /api/game/[id]/judge
 *
 * Host judges answer as correct or incorrect (host only).
 * Updates player score and reveals track info.
 *
 * Request body:
 * {
 *   correct: boolean;
 * }
 *
 * Response:
 * {
 *   pointsAwarded: number;
 *   track: { title, artist, spotify_id };
 *   leaderboard: Array<{ playerId, playerName, score }>;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { calculatePoints, getNextState, validateGameState, GAME_CONFIG } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { correct } = body;

    if (typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'correct must be a boolean' },
        { status: 400 }
      );
    }

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

    // Only allow judging in 'buzzed' state (someone must have buzzed)
    const gameState = validateGameState(session.state);
    if (gameState !== 'buzzed') {
      return NextResponse.json(
        { error: 'Cannot judge - no one has buzzed yet' },
        { status: 400 }
      );
    }

    if (!session.current_round) {
      return NextResponse.json(
        { error: 'No current round' },
        { status: 400 }
      );
    }

    // Get current round details
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*, tracks(title, artist, spotify_id)')
      .eq('session_id', sessionId)
      .eq('round_number', session.current_round)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (!round.tracks) {
      return NextResponse.json({ error: 'Track data not found' }, { status: 404 });
    }

    // CRITICAL: Prevent double judgment - check if round was already judged
    if (round.correct !== null) {
      return NextResponse.json(
        { error: 'This round has already been judged' },
        { status: 400 }
      );
    }

    let pointsAwarded = 0;
    let buzzerPlayerId = round.buzzer_player_id;

    // Validate elapsed_seconds is within valid range before calculating points
    if (buzzerPlayerId && round.elapsed_seconds != null) {
      const elapsed = Number(round.elapsed_seconds);

      if (elapsed < 0 || elapsed > GAME_CONFIG.MAX_TRACK_LENGTH_SECONDS) {
        return NextResponse.json(
          { error: 'Invalid elapsed time in round data' },
          { status: 500 }
        );
      }

      pointsAwarded = calculatePoints(elapsed, correct);
      console.log('Awarding points:', { buzzerPlayerId, pointsAwarded, correct, elapsed });

      // Update player score
      const { error: scoreError } = await supabase.rpc('increment_player_score', {
        player_id: buzzerPlayerId,
        points: pointsAwarded,
      });

      if (scoreError) {
        console.log('RPC error, using fallback:', scoreError);
        // Fallback to manual update if RPC doesn't exist
        const { data: player, error: fetchError } = await supabase
          .from('players')
          .select('score')
          .eq('id', buzzerPlayerId)
          .single();

        if (fetchError) {
          console.error('Failed to fetch player for score update:', fetchError);
        } else if (player) {
          const newScore = (player.score || 0) + pointsAwarded;
          console.log('Updating player score:', { oldScore: player.score, pointsAwarded, newScore });

          const { error: updateError } = await supabase
            .from('players')
            .update({ score: newScore })
            .eq('id', buzzerPlayerId);

          if (updateError) {
            console.error('Failed to update player score:', updateError);
            return NextResponse.json(
              { error: 'Failed to update player score' },
              { status: 500 }
            );
          }
        }
      } else {
        console.log('Score updated successfully via RPC');
      }

      // Update round with result - use atomic check to prevent double judgment
      const { error: roundUpdateError } = await supabase
        .from('game_rounds')
        .update({
          correct,
          points_awarded: pointsAwarded,
        })
        .eq('id', round.id)
        .is('correct', null); // Atomic check

      if (roundUpdateError) {
        console.error('Failed to update round:', roundUpdateError);
        return NextResponse.json(
          { error: 'Failed to update round - may have been judged already' },
          { status: 500 }
        );
      }

      console.log('Round updated with result');
    }

    // Update session state to 'reveal'
    const newState = getNextState(gameState, 'judge');
    const { error: stateError } = await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', sessionId);

    if (stateError) {
      console.error('Failed to update session state:', stateError);
      return NextResponse.json(
        { error: 'Failed to update game state' },
        { status: 500 }
      );
    }

    // Get updated leaderboard
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

    // Broadcast events
    await broadcastStateChange(sessionId, newState);

    if (buzzerPlayerId) {
      await broadcastGameEvent(sessionId, {
        type: 'round_result',
        playerId: buzzerPlayerId,
        correct,
        pointsAwarded,
      });
    }

    await broadcastGameEvent(sessionId, {
      type: 'reveal',
      track: {
        title: round.tracks.title,
        artist: round.tracks.artist,
        spotify_id: round.tracks.spotify_id,
      },
      leaderboard,
    });

    return NextResponse.json({
      pointsAwarded,
      track: {
        title: round.tracks.title,
        artist: round.tracks.artist,
        spotify_id: round.tracks.spotify_id,
      },
      leaderboard,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/judge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
