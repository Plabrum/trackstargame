-- Migration: Cleanup - Remove RPC Functions and Triggers
-- Phase 6 of migration from Postgres RPC to TypeScript/Drizzle
--
-- ⚠️  WARNING: DO NOT APPLY TO PRODUCTION YET! ⚠️
--
-- DEPLOYMENT SEQUENCE (CRITICAL):
-- 1. Deploy new TypeScript code to production (Server Actions)
-- 2. Update React Query hooks to use new Server Actions
-- 3. Test thoroughly in production with BOTH old RPC and new TypeScript
-- 4. Monitor for 24-48 hours to ensure stability
-- 5. THEN apply this cleanup migration to drop old RPC functions
--
-- This allows for zero-downtime deployment and easy rollback if needed.
--
-- What's being removed:
--   - 6 RPC functions (start_game, advance_round, reset_game, judge_answer, submit_answer, finalize_judgments)
--   - 2 buzz-related triggers and their functions (auto_calculate_elapsed, update_session_state_on_buzz)
--
-- What's being kept:
--   - Helper functions (get_track_artists, get_track_genres, get_track_primary_genre)
--     Reason: Still used by tracks_with_artists view for backwards compatibility
--   - calculate_track_popularity_score() and update_track_popularity_score()
--     Reason: Trigger maintains data integrity for popularity_score column
--
-- All game logic is now in TypeScript at:
--   - /lib/db/mutations/game-lifecycle.ts
--   - /lib/db/mutations/player-actions.ts
--   - /lib/db/mutations/judgments.ts
--   - /lib/db/actions/*.ts (Server Actions)

-- ====================
-- Drop Buzz Triggers (Replaced by buzz() TypeScript function)
-- ====================

-- Drop triggers first (before functions they reference)
DROP TRIGGER IF EXISTS calculate_buzz_time ON game_rounds;
DROP TRIGGER IF EXISTS session_state_on_buzz ON game_rounds;

-- Drop trigger functions
DROP FUNCTION IF EXISTS auto_calculate_elapsed();
DROP FUNCTION IF EXISTS update_session_state_on_buzz();

COMMENT ON COLUMN game_rounds.elapsed_seconds IS
  'Elapsed time when player buzzed (calculated in TypeScript, not trigger)';

COMMENT ON COLUMN game_rounds.buzz_time IS
  'Timestamp when player buzzed (set in TypeScript, not trigger)';

-- ====================
-- Drop RPC Functions (Replaced by TypeScript mutations)
-- ====================

-- Game lifecycle functions
DROP FUNCTION IF EXISTS start_game(UUID);
DROP FUNCTION IF EXISTS advance_round(UUID);
DROP FUNCTION IF EXISTS reset_game(UUID, UUID);

-- Player action functions
DROP FUNCTION IF EXISTS judge_answer(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS submit_answer(UUID, UUID, TEXT, BOOLEAN, INT);
DROP FUNCTION IF EXISTS finalize_judgments(UUID, JSONB);

-- ====================
-- Migration Complete
-- ====================

DO $$
BEGIN
  RAISE NOTICE '[OK] Phase 6 cleanup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed:';
  RAISE NOTICE '  - 6 RPC functions -> Replaced by TypeScript mutations';
  RAISE NOTICE '  - 2 buzz triggers -> Replaced by buzz() TypeScript function';
  RAISE NOTICE '';
  RAISE NOTICE 'Kept (still needed):';
  RAISE NOTICE '  - Helper functions (get_track_artists, etc.) -> Used by views';
  RAISE NOTICE '  - Popularity score trigger -> Maintains data integrity';
  RAISE NOTICE '';
  RAISE NOTICE 'All game logic now in TypeScript!';
  RAISE NOTICE '  Location: /lib/db/mutations/*.ts';
  RAISE NOTICE '  Server Actions: /lib/db/actions/*.ts';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration phases completed:';
  RAISE NOTICE '  [OK] Phase 1: Foundation (Drizzle setup)';
  RAISE NOTICE '  [OK] Phase 2: Helper functions migrated';
  RAISE NOTICE '  [OK] Phase 3: Simple mutations migrated';
  RAISE NOTICE '  [OK] Phase 4: Complex mutations migrated';
  RAISE NOTICE '  [OK] Phase 5: Triggers replaced';
  RAISE NOTICE '  [OK] Phase 6: Cleanup complete';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  REMINDER: Only apply to production AFTER deploying new code!';
END $$;
