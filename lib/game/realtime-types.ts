/**
 * Supabase Realtime type definitions.
 *
 * Shared types that can be used in both client and server code.
 */

/**
 * Get the channel name for a game session.
 */
export function getGameChannelName(sessionId: string): string {
  return `game:${sessionId}`;
}

/**
 * Event types that can be broadcast
 */
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
    }
  | {
      type: 'all_answers_submitted';
      roundNumber: number;
    }
  | {
      type: 'answers_finalized';
      roundNumber: number;
      leaderboard: Array<{
        playerId: string;
        playerName: string;
        score: number;
      }>;
    };
