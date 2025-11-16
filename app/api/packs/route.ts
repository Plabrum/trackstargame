/**
 * GET /api/packs
 *
 * Fetch all packs.
 *
 * Response:
 * [
 *   {
 *     id: string;
 *     name: string;
 *     description: string | null;
 *     created_at: string;
 *   }
 * ]
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    const isActive = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    let query = supabase
      .from('packs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: packs, error } = await query;

    if (error) {
      console.error('Failed to fetch packs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packs' },
        { status: 500 }
      );
    }

    if (!packs) {
      return NextResponse.json([]);
    }

    // Handle includes
    if (include.includes('track_count')) {
      const packsWithCounts = await Promise.all(
        packs.map(async (pack) => {
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
    }

    if (include.includes('tracks')) {
      const packsWithTracks = await Promise.all(
        packs.map(async (pack) => {
          const { data: tracks } = await supabase
            .from('tracks')
            .select('*')
            .eq('pack_id', pack.id)
            .order('title');

          return { ...pack, tracks: tracks || [] };
        })
      );

      return NextResponse.json(packsWithTracks);
    }

    return NextResponse.json(packs);
  } catch (error) {
    console.error('Error in GET /api/packs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
