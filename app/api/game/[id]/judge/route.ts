// @ts-nocheck - Supabase type inference issues
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
import { calculatePoints, getNextState } from '@/lib/game/state-machine';

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

    if (session.state !== 'buzzed' && session.state !== 'playing') {
      return NextResponse.json(
        { error: 'Cannot judge in current game state' },
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

    let pointsAwarded = 0;
    let buzzerPlayerId = round.buzzer_player_id;

    // If someone buzzed, calculate points
    if (buzzerPlayerId && round.elapsed_seconds != null) {
      pointsAwarded = calculatePoints(round.elapsed_seconds, correct);

      // Update player score
      const { error: scoreError } = await supabase.rpc('increment_player_score', {
        player_id: buzzerPlayerId,
        points: pointsAwarded,
      });

      if (scoreError) {
        // Fallback to manual update if RPC doesn't exist
        const { data: player } = await supabase
          .from('players')
          .select('score')
          .eq('id', buzzerPlayerId)
          .single();

        if (player) {
          await supabase
            .from('players')
            .update({ score: player.score + pointsAwarded })
            .eq('id', buzzerPlayerId);
        }
      }

      // Update round with result
      await supabase
        .from('game_rounds')
        .update({
          correct,
          points_awarded: pointsAwarded,
        })
        .eq('id', round.id) as { error: any };
    }

    // Update session state to 'reveal'
    const newState = getNextState(session.state as any, 'judge');
    await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', sessionId);

    // Get updated leaderboard
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
