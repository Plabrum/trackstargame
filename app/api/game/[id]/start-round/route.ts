/**
 * POST /api/game/[id]/start-round
 *
 * Start a new round (host only).
 * Retrieves the pre-shuffled track for the current round and records start time.
 *
 * Response:
 * {
 *   trackId: string;
 *   spotify_id: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent } from '@/lib/game/realtime';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('pack_id, current_round, state')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'playing') {
      return NextResponse.json(
        { error: 'Game is not in playing state' },
        { status: 400 }
      );
    }

    if (!session.current_round) {
      return NextResponse.json(
        { error: 'No current round' },
        { status: 400 }
      );
    }

    // Get the pre-created round for the current round number
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('track_id, tracks(id, title, artist, spotify_id)')
      .eq('session_id', sessionId)
      .eq('round_number', session.current_round)
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

    // Update session with round start time
    const roundStartTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        round_start_time: roundStartTime,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to start round' },
        { status: 500 }
      );
    }

    // Broadcast round start event
    await broadcastGameEvent(sessionId, {
      type: 'round_start',
      roundNumber: session.current_round,
      trackId: track.id,
    });

    return NextResponse.json({
      trackId: track.id,
      spotify_id: track.spotify_id,
      roundNumber: session.current_round,
    });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/start-round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
