/**
 * GET /api/packs/with-counts
 *
 * Fetch all packs with their track counts.
 *
 * Response:
 * Array of packs with track_count field
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/types/database';

type Pack = Tables<'packs'>;

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all packs
    const { data: packs, error: packsError } = await supabase
      .from('packs')
      .select('*')
      .order('created_at', { ascending: false });

    if (packsError) {
      console.error('Error fetching packs:', packsError);
      return NextResponse.json(
        { error: 'Failed to fetch packs' },
        { status: 500 }
      );
    }

    if (!packs) {
      return NextResponse.json([]);
    }

    // For each pack, get the track count
    const packsWithCounts = await Promise.all(
      (packs as Pack[]).map(async (pack) => {
        const { count, error: countError } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('pack_id', pack.id);

        if (countError) {
          console.error(`Error counting tracks for pack ${pack.id}:`, countError);
          return { ...pack, track_count: 0 };
        }

        return { ...pack, track_count: count || 0 };
      })
    );

    return NextResponse.json(packsWithCounts);
  } catch (error) {
    console.error('Error in GET /api/packs/with-counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
