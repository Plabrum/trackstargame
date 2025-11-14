// @ts-nocheck - Supabase type inference issues
/**
 * POST /api/session/create
 *
 * Create a new game session.
 *
 * Request body:
 * {
 *   hostName: string;
 *   packId: string;
 * }
 *
 * Response:
 * {
 *   sessionId: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@/lib/auth/config';

export async function POST(request: Request) {
  try {
    // Verify host is authenticated with Spotify
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Host must be authenticated with Spotify' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hostName, packId } = body;

    if (!hostName || !packId) {
      return NextResponse.json(
        { error: 'hostName and packId are required' },
        { status: 400 }
      );
    }

    // Verify pack exists
    const supabase = await createClient();
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    // Create game session
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        host_name: hostName,
        pack_id: packId,
        state: 'lobby',
        current_round: 0,
      })
      .select('id')
      .single() as { data: { id: string } | null; error: any };

    if (sessionError || !gameSession) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: gameSession.id,
    });
  } catch (error) {
    console.error('Error in /api/session/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
