/**
 * GET /api/packs/[id]/tracks
 *
 * Fetch all tracks for a specific pack.
 *
 * Response:
 * Array of tracks with id, title, artist, spotify_id
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

    // Fetch all tracks for this pack
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, title, artist, spotify_id')
      .eq('pack_id', packId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    return NextResponse.json(tracks || []);
  } catch (error) {
    console.error('Error in GET /api/packs/[id]/tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
