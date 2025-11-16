/**
 * Buzz Action API
 *
 * POST /api/sessions/[id]/rounds/current/buzz - Player buzzes in
 */

import { createClient } from '@/lib/supabase/server';
import { apiHandler, ApiErrors, parseBody } from '@/lib/api/route-handler';
import { BuzzSchema } from '@/lib/api/schemas';
import type { RoundsAPI } from '@/lib/api/types';
import { getNextGameState, enforceBuzzRules, StateTransitionError, GameRuleError } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState } from '@/lib/game/state-machine';

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

    const currentState = validateGameState(session.state);

    try {
      // Enforce game rules using state machine
      enforceBuzzRules(session);
    } catch (error) {
      if (error instanceof GameRuleError) {
        throw ApiErrors.badRequest(error.message);
      }
      throw error;
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

    // Get player name for broadcast
    const { data: player } = await supabase
      .from('players')
      .select('name')
      .eq('id', playerId)
      .single();

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

    // Get next state through state machine
    try {
      const nextState = getNextGameState(currentState, 'buzz');

      // Update session state to buzzed
      await supabase
        .from('game_sessions')
        .update({ state: nextState })
        .eq('id', sessionId);

      // Broadcast buzz event
      await broadcastGameEvent(sessionId, {
        type: 'buzz',
        playerId,
        playerName: player?.name || 'Unknown',
        elapsedSeconds,
      });

      await broadcastStateChange(sessionId, nextState);
    } catch (error) {
      if (error instanceof StateTransitionError) {
        throw ApiErrors.badRequest(error.message);
      }
      throw error;
    }

    return updatedRound;
  }
);
