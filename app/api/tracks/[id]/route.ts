/**
 * GET /api/tracks/[id]
 *
 * Fetch track details by ID.
 *
 * Response:
 * {
 *   id: string;
 *   title: string;
 *   artist: string;
 *   spotify_id: string;
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const supabase = await createClient();

    // Fetch track details
    const { data: track, error } = await supabase
      .from('tracks')
      .select('id, title, artist, spotify_id')
      .eq('id', trackId)
      .single();

    if (error || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    return NextResponse.json(track);
  } catch (error) {
    console.error('Error in GET /api/tracks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
