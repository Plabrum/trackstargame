/**
 * GET /api/game/[id]/players
 *
 * Fetch all players for a game session, ordered by score.
 *
 * Response:
 * [
 *   {
 *     id: string;
 *     session_id: string;
 *     name: string;
 *     score: number;
 *     created_at: string;
 *   }
 * ]
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    if (error) {
      console.error('Failed to fetch players:', error);
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Error in GET /api/game/[id]/players:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
