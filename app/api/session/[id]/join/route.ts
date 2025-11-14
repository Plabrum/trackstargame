// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/session/[id]/join
 *
 * Join a game session as a player.
 *
 * Request body:
 * {
 *   playerName: string;
 * }
 *
 * Response:
 * {
 *   playerId: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastGameEvent } from '@/lib/game/realtime';
import { isValidPlayerCount } from '@/lib/game/state-machine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { playerName } = body;

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'playerName is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify session exists and is in lobby state
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state')
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

    // Check current player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (count !== null && !isValidPlayerCount(count + 1)) {
      return NextResponse.json(
        { error: 'Game is full (maximum 10 players)' },
        { status: 400 }
      );
    }

    // Add player to session
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        session_id: sessionId,
        name: playerName.trim(),
        score: 0,
      })
      .select('id, name')
      .single() as { data: { id: string; name: string } | null; error: any };

    if (playerError) {
      // Check for duplicate name
      if (playerError.code === '23505') {
        return NextResponse.json(
          { error: 'Player name already taken in this game' },
          { status: 409 }
        );
      }

      console.error('Failed to add player:', playerError);
      return NextResponse.json(
        { error: 'Failed to join session' },
        { status: 500 }
      );
    }

    // Broadcast player joined event
    await broadcastGameEvent(sessionId, {
      type: 'player_joined',
      playerId: player.id,
      playerName: player.name,
    });

    return NextResponse.json({
      playerId: player.id,
    });
  } catch (error) {
    console.error('Error in /api/session/[id]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
