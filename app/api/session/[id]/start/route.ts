// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/session/[id]/start
 *
 * Start the game (host only).
 * Requires at least 2 players.
 * Shuffles all tracks from the pack and pre-creates all game rounds.
 *
 * Response:
 * {
 *   success: boolean;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { isValidPlayerCount, getNextState } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get session and verify it's in lobby state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state, current_round, pack_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'lobby') {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      );
    }

    // Check player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (count === null || !isValidPlayerCount(count)) {
      return NextResponse.json(
        { error: `Need ${isValidPlayerCount(count || 0) ? '' : 'between 2 and 10'} players to start` },
        { status: 400 }
      );
    }

    // Fetch all tracks from the pack
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id')
      .eq('pack_id', session.pack_id);

    if (tracksError || !tracks || tracks.length === 0) {
      console.error('Failed to fetch tracks:', tracksError);
      return NextResponse.json(
        { error: 'No tracks found in pack' },
        { status: 404 }
      );
    }

    // Shuffle tracks using Fisher-Yates algorithm
    const shuffledTracks = [...tracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    // Create all game rounds upfront with shuffled order
    const roundsToInsert = shuffledTracks.map((track, index) => ({
      session_id: sessionId,
      round_number: index + 1,
      track_id: track.id,
    }));

    const { error: roundsError } = await supabase
      .from('game_rounds')
      .insert(roundsToInsert) as { error: any };

    if (roundsError) {
      console.error('Failed to create rounds:', roundsError);
      return NextResponse.json(
        { error: 'Failed to create game rounds' },
        { status: 500 }
      );
    }

    // Update session state to 'playing' and set round to 1
    const newState = getNextState('lobby', 'start');
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        state: newState,
        current_round: 1,
      })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to start game:', updateError);
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

    // Broadcast state change and game started event
    await broadcastStateChange(sessionId, newState);
    await broadcastGameEvent(sessionId, {
      type: 'game_started',
      roundNumber: 1,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/session/[id]/start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
