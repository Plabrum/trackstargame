/**
 * Session Resource API
 *
 * GET   /api/sessions/[id] - Get session details
 * PATCH /api/sessions/[id] - Update session state
 * DELETE /api/sessions/[id] - Delete session
 *
 * Query params for GET:
 * ?include=players,rounds,pack - Include related resources
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextGameState, enforceGameStartRules, StateTransitionError, GameRuleError } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState } from '@/lib/game/state-machine';

/**
 * GET /api/sessions/[id]
 * Fetch session with optional includes
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    const supabase = await createClient();

    // Fetch base session
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result: any = { ...session };

    // Conditionally include related resources
    if (include.includes('players')) {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      result.players = players || [];
    }

    if (include.includes('rounds')) {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true });

      result.rounds = rounds || [];
    }

    if (include.includes('pack') && session.pack_id) {
      const { data: pack } = await supabase
        .from('packs')
        .select('*')
        .eq('id', session.pack_id)
        .single();

      result.pack = pack;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update session state
 *
 * Request: { action: "start" | "end" }
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

    switch (action) {
      case 'start': {
        // Get session and validate
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get player count
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        const currentState = validateGameState(session.state);

        try {
          // Enforce game rules
          enforceGameStartRules(session, playerCount ?? 0);

          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'start');

          // Create first round
          const { data: firstRound, error: roundError } = await supabase
            .from('game_rounds')
            .insert({
              session_id: sessionId,
              round_number: 1,
              track_id: null, // Will be set when round starts
            })
            .select()
            .single();

          if (roundError || !firstRound) {
            return NextResponse.json({ error: 'Failed to create first round' }, { status: 500 });
          }

          // Update session state to 'ready' with current_round = 1
          const { data: updatedSession, error: updateError } = await supabase
            .from('game_sessions')
            .update({ state: nextState, current_round: 1 })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          // Broadcast game started event
          await broadcastGameEvent(sessionId, {
            type: 'game_started',
            roundNumber: 1,
          });

          await broadcastStateChange(sessionId, nextState);

          return NextResponse.json(updatedSession);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      case 'end': {
        // Get session and validate
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const currentState = validateGameState(session.state);

        try {
          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'finish');

          // Get final leaderboard
          const { data: players } = await supabase
            .from('players')
            .select('id, name, score')
            .eq('session_id', sessionId)
            .order('score', { ascending: false });

          const leaderboard = (players || []).map(p => ({
            playerId: p.id,
            playerName: p.name,
            score: p.score || 0,
          }));

          const winner = leaderboard[0] || {
            playerId: '',
            playerName: 'No winner',
            score: 0,
          };

          // Update session state to finished
          const { data: updatedSession, error: updateError } = await supabase
            .from('game_sessions')
            .update({ state: nextState })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          // Broadcast game end event
          await broadcastGameEvent(sessionId, {
            type: 'game_end',
            leaderboard,
            winner,
          });

          await broadcastStateChange(sessionId, nextState);

          return NextResponse.json(updatedSession);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "start" or "end"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PATCH /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session (cleanup)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
