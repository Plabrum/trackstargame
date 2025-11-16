/**
 * Buzz Action API
 *
 * POST /api/sessions/[id]/rounds/current/buzz - Player buzzes in
 */

import { createClient } from '@/lib/supabase/server';
import { apiHandler, ApiErrors, parseBody } from '@/lib/api/route-handler';
import { BuzzSchema } from '@/lib/api/schemas';
import type { RoundsAPI } from '@/lib/api/types';

type RouteParams = { id: string };

/**
 * POST /api/sessions/[id]/rounds/current/buzz
 * Player buzzes in during current round
 */
export const POST = apiHandler<RoundsAPI.BuzzResponse, RouteParams>(
  async (request, { params }) => {
    const { id: sessionId } = await params;

    // ✅ Validated! playerId is guaranteed to be a valid UUID
    const { playerId } = await parseBody(request, BuzzSchema);

    const supabase = await createClient();

    // Get session to verify state and get current round
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('state, current_round, round_start_time')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw ApiErrors.notFound('Session');
    }

    // Validate game state
    if (session.state !== 'playing') {
      throw ApiErrors.badRequest('Cannot buzz when game is not playing');
    }

    if (!session.round_start_time) {
      throw ApiErrors.badRequest('Round has not started yet');
    }

    // Get current round to check if someone already buzzed
    const currentRoundNum = session.current_round || 0;
    const { data: currentRound, error: roundError } = await supabase
      .from('game_rounds')
      .select('buzzer_player_id')
      .eq('session_id', sessionId)
      .eq('round_number', currentRoundNum)
      .single();

    if (roundError) {
      throw ApiErrors.notFound('Round');
    }

    if (currentRound.buzzer_player_id) {
      throw ApiErrors.badRequest('Someone already buzzed');
    }

    // Calculate elapsed time
    const elapsedMs = Date.now() - new Date(session.round_start_time).getTime();
    const elapsedSeconds = elapsedMs / 1000;

    // Update round with buzzer info
    const roundNum = session.current_round || 0;
    const { data: updatedRound, error: updateError } = await supabase
      .from('game_rounds')
      .update({
        buzzer_player_id: playerId,
        elapsed_seconds: elapsedSeconds,
      })
      .eq('session_id', sessionId)
      .eq('round_number', roundNum)
      .select()
      .single();

    if (updateError) {
      throw ApiErrors.internal(updateError.message);
    }

    // Update session state to buzzed
    await supabase
      .from('game_sessions')
      .update({ state: 'buzzed' })
      .eq('id', sessionId);

    return updatedRound;
  }
);
