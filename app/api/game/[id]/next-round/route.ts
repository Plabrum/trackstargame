// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/next-round
 *
 * Advance to next round and start it, or finish game (host only).
 * This automatically selects a track and starts the round.
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

    // Get session pack_id for track selection
    const { data: sessionDetails, error: detailsError } = await supabase
      .from('game_sessions')
      .select('pack_id')
      .eq('id', sessionId)
      .single();

    if (detailsError || !sessionDetails) {
      return NextResponse.json({ error: 'Failed to fetch session details' }, { status: 500 });
    }

    // Get tracks already used in this session
    const { data: usedRounds } = await supabase
      .from('game_rounds')
      .select('track_id')
      .eq('session_id', sessionId);

    const usedTrackIds = usedRounds?.map((r) => r.track_id) || [];

    // Get a random unused track from the pack
    let query = supabase
      .from('tracks')
      .select('id, title, artist, spotify_id')
      .eq('pack_id', sessionDetails.pack_id);

    if (usedTrackIds.length > 0) {
      query = query.not('id', 'in', `(${usedTrackIds.join(',')})`);
    }

    const { data: tracks, error: tracksError } = await query;

    if (tracksError || !tracks || tracks.length === 0) {
      console.error('Failed to fetch tracks:', tracksError);
      return NextResponse.json(
        { error: 'No available tracks in pack' },
        { status: 404 }
      );
    }

    // Select random track
    const track = tracks[Math.floor(Math.random() * tracks.length)];

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

    // Create round record
    const { error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        session_id: sessionId,
        round_number: nextRound,
        track_id: track.id,
      }) as { error: any };

    if (roundError) {
      console.error('Failed to create round:', roundError);
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
