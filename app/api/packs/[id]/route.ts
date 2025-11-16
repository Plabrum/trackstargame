/**
 * GET /api/packs/[id]
 *
 * Fetch a single pack with all its tracks.
 *
 * Response:
 * {
 *   id: string;
 *   name: string;
 *   description: string | null;
 *   created_at: string;
 *   tracks: [
 *     {
 *       id: string;
 *       title: string;
 *       artist: string;
 *       spotify_id: string;
 *       pack_id: string;
 *       created_at: string;
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packId } = await params;
    const supabase = await createClient();

    const { data: pack, error } = await supabase
      .from('packs')
      .select(`
        *,
        tracks (*)
      `)
      .eq('id', packId)
      .single();

    if (error || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    return NextResponse.json(pack);
  } catch (error) {
    console.error('Error in GET /api/packs/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
