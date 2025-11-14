// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/game/[id]/reveal
 *
 * Reveals the track without buzzing (timeout/skip).
 * Host can use this to stop the round early and show the answer.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastStateChange } from '@/lib/game/realtime';
import { getNextState } from '@/lib/game/state-machine';

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
      .select('state')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Can only reveal from playing state
    if (session.state !== 'playing') {
      return NextResponse.json(
        { error: 'Can only reveal during playing state' },
        { status: 400 }
      );
    }

    // Transition to reveal state (no buzz/timeout case)
    const newState = getNextState(session.state as any, 'judge');

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ state: newState })
      .eq('id', sessionId) as { error: any };

    if (updateError) {
      console.error('Failed to update game state:', updateError);
      return NextResponse.json(
        { error: 'Failed to reveal track' },
        { status: 500 }
      );
    }

    // Broadcast state change
    await broadcastStateChange(sessionId, newState);

    return NextResponse.json({ success: true, newState });
  } catch (error) {
    console.error('Error in POST /api/game/[id]/reveal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
