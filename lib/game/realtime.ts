/**
 * Supabase Realtime broadcasting utilities.
 *
 * Handles broadcasting game events to all connected clients.
 */

import { createClient } from '@/lib/supabase/server';

// Event types that can be broadcast
export type GameEvent =
  | {
      type: 'player_joined';
      playerId: string;
      playerName: string;
    }
  | {
      type: 'player_left';
      playerId: string;
      playerName: string;
    }
  | {
      type: 'game_started';
      roundNumber: number;
    }
  | {
      type: 'round_start';
      roundNumber: number;
      trackId: string;
    }
  | {
      type: 'buzz';
      playerId: string;
      playerName: string;
      elapsedSeconds: number;
    }
  | {
      type: 'round_result';
      playerId: string;
      correct: boolean;
      pointsAwarded: number;
    }
  | {
      type: 'reveal';
      track: {
        title: string;
        artist: string;
        spotify_id: string;
      };
      leaderboard: Array<{
        playerId: string;
        playerName: string;
        score: number;
      }>;
    }
  | {
      type: 'state_change';
      newState: string;
    }
  | {
      type: 'game_end';
      leaderboard: Array<{
        playerId: string;
        playerName: string;
        score: number;
      }>;
      winner: {
        playerId: string;
        playerName: string;
        score: number;
      };
    };

/**
 * Broadcast an event to all clients subscribed to a game session.
 *
 * @param sessionId - The game session ID
 * @param event - The event to broadcast
 */
export async function broadcastGameEvent(
  sessionId: string,
  event: GameEvent
): Promise<void> {
  const supabase = await createClient();

  const channel = supabase.channel(`game:${sessionId}`);

  await channel.send({
    type: 'broadcast',
    event: event.type,
    payload: event,
  });
}

/**
 * Broadcast a state change to all clients.
 */
export async function broadcastStateChange(
  sessionId: string,
  newState: string
): Promise<void> {
  await broadcastGameEvent(sessionId, {
    type: 'state_change',
    newState,
  });
}
