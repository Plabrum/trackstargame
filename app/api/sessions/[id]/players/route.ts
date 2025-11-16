/**
 * Players Sub-Resource API
 *
 * GET  /api/sessions/[id]/players - List players
 * POST /api/sessions/[id]/players - Join session
 */

import { createClient } from '@/lib/supabase/server';
import { apiHandler, ApiErrors, parseBody, parseQuery } from '@/lib/api/route-handler';
import { JoinSessionSchema, PlayerSortSchema, OrderSchema } from '@/lib/api/schemas';
import type { PlayersAPI } from '@/lib/api/types';
import { z } from 'zod';

type RouteParams = { id: string };

// Query schema for GET
const ListPlayersQuerySchema = z.object({
  sort: PlayerSortSchema,
  order: OrderSchema,
});

/**
 * GET /api/sessions/[id]/players
 * List all players in a session
 */
export const GET = apiHandler<PlayersAPI.ListResponse, RouteParams>(async (request, { params }) => {
  const { id: sessionId } = await params;

  // ✅ Validated and typed query params
  const { sort, order } = parseQuery(request, ListPlayersQuerySchema);

  const supabase = await createClient();

  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId)
    .order(sort, { ascending: order === 'asc' });

  if (error) {
    throw ApiErrors.internal(error.message);
  }

  return players || [];
});

/**
 * POST /api/sessions/[id]/players
 * Join a session as a player
 */
export const POST = apiHandler<PlayersAPI.JoinResponse, RouteParams>(async (request, { params }) => {
  const { id: sessionId } = await params;

  // ✅ Validated and typed request body - no manual validation needed!
  const { playerName } = await parseBody(request, JoinSessionSchema);

  const supabase = await createClient();

  // Verify session exists and is in lobby state
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('state')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw ApiErrors.notFound('Session');
  }

  if (session.state !== 'lobby') {
    throw ApiErrors.badRequest('Cannot join: game has already started');
  }

  // Create player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      session_id: sessionId,
      name: playerName.trim(),
      score: 0,
    })
    .select()
    .single();

  if (playerError) {
    console.error('Failed to create player:', playerError);
    throw ApiErrors.internal('Failed to join session');
  }

  return player;
});
