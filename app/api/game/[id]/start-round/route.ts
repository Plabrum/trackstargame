// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/start-round
 *
 * Start a new round (host only).
 * Selects a random unused track from the pack and records start time.
 *
 * Response:
 * {
 *   trackId: string;
 *   spotify_id: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';

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
      .eq('pack_id', session.pack_id);

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

    // Update session with round start time
    const roundStartTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        round_start_time: roundStartTime,
      })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to start round' },
        { status: 500 }
      );
    }

    // Create round record (without buzzer yet)
    const { error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        session_id: sessionId,
        round_number: session.current_round,
        track_id: track.id,
      }) as { error: any };

    if (roundError) {
      console.error('Failed to create round:', roundError);
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
