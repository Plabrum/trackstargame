/**
 * API Request and Response Types
 *
 * Shared between Next.js API routes and future Expo app.
 */

import type { Tables } from '@/lib/types/database';

// ============================================================================
// Database Types (Re-exported for convenience)
// ============================================================================

export type GameSession = Tables<'game_sessions'>;
export type Player = Tables<'players'>;
export type GameRound = Tables<'game_rounds'>;
export type Pack = Tables<'packs'>;
export type Track = Tables<'tracks'>;

// ============================================================================
// Sessions API
// ============================================================================

export namespace SessionsAPI {
  // POST /api/sessions
  export interface CreateRequest {
    packId: string;
  }

  export interface CreateResponse extends GameSession {
    // Returns full session object
  }

  // GET /api/sessions
  export interface ListQuery {
    state?: 'lobby' | 'ready' | 'playing' | 'buzzed' | 'reveal' | 'finished';
    limit?: number;
    offset?: number;
  }

  export interface ListResponse {
    sessions: GameSession[];
    total: number;
    limit: number;
    offset: number;
  }

  // GET /api/sessions/[id]
  export interface GetQuery {
    include?: string; // 'players' | 'rounds' | 'pack' | 'players,rounds'
  }

  export interface GetResponse extends GameSession {
    players?: Player[];
    rounds?: GameRound[];
    pack?: Pack;
  }

  // PATCH /api/sessions/[id]
  export interface UpdateRequest {
    action: 'start' | 'end';
  }

  export interface UpdateResponse extends GameSession {
    // Returns updated session
  }
}

// ============================================================================
// Players API
// ============================================================================

export namespace PlayersAPI {
  // GET /api/sessions/[id]/players
  export interface ListQuery {
    sort?: 'score' | 'joined_at' | 'name';
    order?: 'asc' | 'desc';
  }

  export type ListResponse = Player[];

  // POST /api/sessions/[id]/players
  export interface JoinRequest {
    playerName: string;
  }

  export interface JoinResponse extends Player {
    // Returns created player
  }
}

// ============================================================================
// Rounds API
// ============================================================================

export namespace RoundsAPI {
  // GET /api/sessions/[id]/rounds
  export type ListResponse = GameRound[];

  // POST /api/sessions/[id]/rounds
  export interface NextRoundRequest {
    // Empty body or optional overrides
  }

  export interface NextRoundResponse extends GameSession {
    // Returns updated session with new current_round
  }

  // GET /api/sessions/[id]/rounds/current
  export interface GetCurrentResponse extends GameRound {
    // Returns current round
  }

  // PATCH /api/sessions/[id]/rounds/current
  export type UpdateCurrentRequest =
    | { action: 'start' }
    | { action: 'judge'; correct: boolean }
    | { action: 'reveal' };

  export type UpdateCurrentResponse = GameSession | GameRound;

  // POST /api/sessions/[id]/rounds/current/buzz
  export interface BuzzRequest {
    playerId: string;
  }

  export interface BuzzResponse extends GameRound {
    // Returns updated round with buzzer info
  }
}

// ============================================================================
// Packs API
// ============================================================================

export namespace PacksAPI {
  // GET /api/packs
  export interface ListQuery {
    include?: string; // 'track_count' | 'tracks' | 'track_count,tracks'
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }

  export interface PackWithCount extends Pack {
    track_count: number;
  }

  export interface PackWithTracks extends Pack {
    tracks: Track[];
  }

  export type ListResponse = Pack[] | PackWithCount[] | PackWithTracks[];

  // GET /api/packs/[id]
  export interface GetQuery {
    include?: string; // 'tracks'
  }

  export type GetResponse = Pack | PackWithTracks;

  // GET /api/packs/[id]/tracks
  export type ListTracksResponse = Track[];
}

// ============================================================================
// Tracks API
// ============================================================================

export namespace TracksAPI {
  // GET /api/tracks/[id]
  export interface GetResponse extends Track {
    // Returns single track
  }
}

// ============================================================================
// Error Response (Standard across all APIs)
// ============================================================================

export interface ApiErrorResponse {
  error: string;
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract query params from URL search params
 */
export type QueryParams<T> = {
  [K in keyof T]: T[K] extends string | undefined
    ? string | null
    : T[K] extends number | undefined
    ? number | null
    : T[K] extends boolean | undefined
    ? boolean | null
    : T[K];
};

/**
 * API Response wrapper
 */
export type ApiResponse<T> = T | ApiErrorResponse;
