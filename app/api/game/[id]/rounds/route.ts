/**
 * GET /api/game/[id]/rounds
 *
 * Fetch all rounds for a game session, ordered by round number.
 *
 * Response:
 * [
 *   {
 *     id: string;
 *     session_id: string;
 *     round_number: number;
 *     track_id: string;
 *     correct: boolean | null;
 *     points_awarded: number | null;
 *     elapsed_seconds: number | null;
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

    const { data: rounds, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true });

    if (error) {
      console.error('Failed to fetch rounds:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rounds' },
        { status: 500 }
      );
    }

    return NextResponse.json(rounds || []);
  } catch (error) {
    console.error('Error in GET /api/game/[id]/rounds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
