-- Migration: Add NOT NULL constraints to required fields
-- Date: 2025-11-23
-- Purpose: Make state column NOT NULL since it always has a default value

-- Add NOT NULL constraint to game_sessions.state
-- This is safe because:
-- 1. The column has a DEFAULT 'lobby' value
-- 2. The valid_game_state CHECK constraint ensures valid values
-- 3. All existing rows should have a state value
ALTER TABLE game_sessions
ALTER COLUMN state SET NOT NULL;

COMMENT ON COLUMN game_sessions.state IS
  'Current state of the game session. Required field with valid states enforced by check constraint.';
