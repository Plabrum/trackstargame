/**
 * Rounds Sub-Resource API
 *
 * GET  /api/sessions/[id]/rounds - List all rounds
 * POST /api/sessions/[id]/rounds - Advance to next round
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextGameState, enforceNextRoundRules, StateTransitionError, GameRuleError } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState, GAME_CONFIG } from '@/lib/game/state-machine';

/**
 * GET /api/sessions/[id]/rounds
 * List all rounds in a session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const { data: rounds, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(rounds || []);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/rounds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/rounds
 * Advance to next round
 *
 * Response: Updated session with new current_round
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get current session state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('current_round, pack_id, state, total_rounds')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const currentState = validateGameState(session.state);
    const nextRound = (session.current_round || 0) + 1;

    try {
      // Enforce game rules
      enforceNextRoundRules(session, nextRound);

      // Get next state through state machine
      const nextState = getNextGameState(currentState, 'next_round', {
        currentRound: session.current_round || 0,
        nextRound,
        totalRounds: session.total_rounds,
      });

      // If next state is finished, update and return
      if (nextState === 'finished') {
        const { data: updatedSession, error: updateError } = await supabase
          .from('game_sessions')
          .update({ state: nextState })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }

        await broadcastStateChange(sessionId, nextState);

        return NextResponse.json(updatedSession);
      }
    } catch (error) {
      if (error instanceof StateTransitionError || error instanceof GameRuleError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // Get random track from pack for next round
    if (!session.pack_id) {
      return NextResponse.json(
        { error: 'Session has no pack assigned' },
        { status: 400 }
      );
    }

    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id')
      .eq('pack_id', session.pack_id);

    if (tracksError || !tracks || tracks.length === 0) {
      return NextResponse.json(
        { error: 'No tracks found in pack' },
        { status: 500 }
      );
    }

    // Get previously used tracks
    const { data: usedRounds } = await supabase
      .from('game_rounds')
      .select('track_id')
      .eq('session_id', sessionId);

    const usedTrackIds = new Set(
      usedRounds?.map((r) => r.track_id).filter(Boolean) || []
    );

    // Filter out used tracks
    const availableTracks = tracks.filter((t) => !usedTrackIds.has(t.id));

    if (availableTracks.length === 0) {
      return NextResponse.json(
        { error: 'No more unused tracks available' },
        { status: 400 }
      );
    }

    // Pick random track
    const randomTrack =
      availableTracks[Math.floor(Math.random() * availableTracks.length)];

    // Create new round
    const { data: newRound, error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        session_id: sessionId,
        round_number: nextRound,
        track_id: randomTrack.id,
      })
      .select()
      .single();

    if (roundError) {
      console.error('Failed to create round:', roundError);
      return NextResponse.json(
        { error: 'Failed to create round' },
        { status: 500 }
      );
    }

    // Update session to next round and set state to playing (auto-start)
    const { data: updatedSession, error: updateError } = await supabase
      .from('game_sessions')
      .update({
        current_round: nextRound,
        state: 'playing',
        round_start_time: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Broadcast round start event
    await broadcastGameEvent(sessionId, {
      type: 'round_start',
      roundNumber: nextRound,
      trackId: randomTrack.id,
    });

    // Broadcast state change to playing
    await broadcastStateChange(sessionId, 'playing');

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/rounds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
