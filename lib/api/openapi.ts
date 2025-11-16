/**
 * OpenAPI Specification Generator
 *
 * Generates OpenAPI 3.0 spec from Zod schemas for:
 * - API documentation
 * - Type-safe client generation with Orval
 * - Validation testing
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from './zod-openapi';
import * as schemas from './schemas';

const registry = new OpenAPIRegistry();

// ============================================================================
// Sessions Endpoints
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/sessions',
  description: 'Create a new game session',
  summary: 'Create session',
  request: {
    body: {
      content: {
        'application/json': {
          schema: schemas.CreateSessionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session created successfully',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            code: z.string(),
            host_name: z.string(),
            pack_id: z.string().uuid(),
            state: z.enum(['lobby', 'ready', 'playing', 'buzzed', 'reveal', 'finished']),
            current_round: z.number().int(),
            round_start_time: z.string().datetime().nullable(),
            created_at: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
  tags: ['Sessions'],
});

registry.registerPath({
  method: 'get',
  path: '/api/sessions/{id}',
  description: 'Get session details with optional includes',
  summary: 'Get session',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      include: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Session retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            code: z.string(),
            state: z.string(),
            current_round: z.number(),
            players: z.array(z.any()).optional(),
            rounds: z.array(z.any()).optional(),
            pack: z.any().optional(),
          }),
        },
      },
    },
    404: {
      description: 'Session not found',
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
  tags: ['Sessions'],
});

// ============================================================================
// Players Endpoints
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/sessions/{id}/players',
  description: 'Join a game session as a player',
  summary: 'Join session',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: schemas.JoinSessionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Player joined successfully',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            session_id: z.string().uuid(),
            name: z.string(),
            score: z.number().int(),
            joined_at: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: 'Bad request - invalid input or game already started',
    },
    404: {
      description: 'Session not found',
    },
  },
  tags: ['Players'],
});

registry.registerPath({
  method: 'get',
  path: '/api/sessions/{id}/players',
  description: 'List all players in a session',
  summary: 'List players',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      sort: schemas.PlayerSortSchema,
      order: schemas.OrderSchema,
    }),
  },
  responses: {
    200: {
      description: 'Players list retrieved',
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              id: z.string().uuid(),
              session_id: z.string().uuid(),
              name: z.string(),
              score: z.number().int(),
              joined_at: z.string().datetime(),
            })
          ),
        },
      },
    },
  },
  tags: ['Players'],
});

// ============================================================================
// Rounds Endpoints
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/sessions/{id}/rounds/current/buzz',
  description: 'Player buzzes in during current round',
  summary: 'Buzz in',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: schemas.BuzzSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Buzz recorded successfully',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string().uuid(),
            session_id: z.string().uuid(),
            round_number: z.number().int(),
            track_id: z.string().uuid(),
            buzzer_player_id: z.string().uuid().nullable(),
            elapsed_seconds: z.number().nullable(),
            was_correct: z.boolean().nullable(),
            points_awarded: z.number().int().nullable(),
          }),
        },
      },
    },
    400: {
      description: 'Bad request - game not playing, round not started, or someone already buzzed',
    },
    404: {
      description: 'Session or round not found',
    },
  },
  tags: ['Rounds'],
});

registry.registerPath({
  method: 'patch',
  path: '/api/sessions/{id}/rounds/current',
  description: 'Update current round state (start, judge, reveal)',
  summary: 'Update current round',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: schemas.UpdateRoundSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Round updated successfully',
    },
    400: {
      description: 'Bad request - invalid action',
    },
  },
  tags: ['Rounds'],
});

// ============================================================================
// Packs Endpoints
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/packs',
  description: 'List all music packs with optional includes',
  summary: 'List packs',
  request: {
    query: schemas.PackListQuerySchema,
  },
  responses: {
    200: {
      description: 'Packs list retrieved',
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              description: z.string().nullable(),
              is_active: z.boolean(),
              created_at: z.string().datetime(),
              track_count: z.number().int().optional(),
              tracks: z.array(z.any()).optional(),
            })
          ),
        },
      },
    },
  },
  tags: ['Packs'],
});

// ============================================================================
// Generate OpenAPI Document
// ============================================================================

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Trackstar Game API',
    description: 'Multiplayer music guessing game API with buzz-in mechanics',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://trackstar.yourdomain.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Sessions', description: 'Game session management' },
    { name: 'Players', description: 'Player management' },
    { name: 'Rounds', description: 'Game rounds and gameplay' },
    { name: 'Packs', description: 'Music packs' },
  ],
});
