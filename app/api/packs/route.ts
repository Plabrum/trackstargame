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

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: packs, error } = await supabase
      .from('packs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch packs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packs' },
        { status: 500 }
      );
    }

    return NextResponse.json(packs || []);
  } catch (error) {
    console.error('Error in GET /api/packs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
