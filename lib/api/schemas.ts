/**
 * API Request Validation Schemas
 *
 * Runtime validation using Zod.
 * These schemas automatically generate TypeScript types AND validate at runtime.
 */

import { z } from 'zod';

// ============================================================================
// Sessions Schemas
// ============================================================================

export const CreateSessionSchema = z.object({
  packId: z.string().uuid('Invalid pack ID format'),
});

export const UpdateSessionSchema = z.object({
  action: z.enum(['start', 'end']),
});

export const SessionIncludeSchema = z
  .string()
  .optional()
  .transform((val) => val?.split(',') || [])
  .pipe(z.array(z.enum(['players', 'rounds', 'pack'])));

// ============================================================================
// Players Schemas
// ============================================================================

export const JoinSessionSchema = z.object({
  playerName: z
    .string()
    .min(1, 'Player name is required')
    .max(50, 'Player name must be 50 characters or less')
    .trim()
    .refine((name) => name.length > 0, 'Player name cannot be empty'),
});

export const PlayerSortSchema = z.enum(['score', 'joined_at', 'name']).default('score');
export const OrderSchema = z.enum(['asc', 'desc']).default('desc');

// ============================================================================
// Rounds Schemas
// ============================================================================

export const BuzzSchema = z.object({
  playerId: z.string().uuid('Invalid player ID format'),
});

export const UpdateRoundSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({
    action: z.literal('judge'),
    correct: z.boolean(),
  }),
  z.object({ action: z.literal('reveal') }),
]);

// ============================================================================
// Packs Schemas
// ============================================================================

export const PackIncludeSchema = z
  .string()
  .optional()
  .transform((val) => val?.split(',') || [])
  .pipe(z.array(z.enum(['track_count', 'tracks'])));

export const PackListQuerySchema = z.object({
  include: PackIncludeSchema.optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Type Inference (automatically derived from schemas)
// ============================================================================

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type JoinSessionInput = z.infer<typeof JoinSessionSchema>;
export type BuzzInput = z.infer<typeof BuzzSchema>;
export type UpdateRoundInput = z.infer<typeof UpdateRoundSchema>;
export type PackListQuery = z.infer<typeof PackListQuerySchema>;
