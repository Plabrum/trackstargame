// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/next-round
 *
 * Advance to next round and start it, or finish game (host only).
 * Retrieves the pre-shuffled track for the next round and starts it.
 *
 * Response (if advancing):
 * {
 *   state: 'playing';
 *   roundNumber: number;
 *   trackId: string;
 *   spotify_id: string;
 * }
 *
 * Response (if finished):
 * {
 *   state: 'finished';
 *   leaderboard: Array;
 *   winner: { playerId, playerName, score };
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

    // Get the pre-created round for the next round number
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('track_id, tracks(id, title, artist, spotify_id)')
      .eq('session_id', sessionId)
      .eq('round_number', nextRound)
      .single();

    if (roundError || !round) {
      console.error('Failed to fetch round:', roundError);
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    // Extract track from the joined query
    const track = Array.isArray(round.tracks) ? round.tracks[0] : round.tracks;

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found for this round' },
        { status: 404 }
      );
    }

    // Update session with new round and start time
    const roundStartTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        state: newState,
        current_round: nextRound,
        round_start_time: roundStartTime,
      })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to advance round:', updateError);
      return NextResponse.json(
        { error: 'Failed to advance round' },
        { status: 500 }
      );
    }

    // Broadcast state change and round start event
    await broadcastStateChange(sessionId, newState);
    await broadcastGameEvent(sessionId, {
      type: 'round_start',
      roundNumber: nextRound,
      trackId: track.id,
    });

    return NextResponse.json({
      state: newState,
      roundNumber: nextRound,
      trackId: track.id,
      spotify_id: track.spotify_id,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/next-round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
