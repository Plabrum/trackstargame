-- Migration: Add Data Integrity Constraints
-- Date: 2025-11-16
-- Purpose: Add database constraints to prevent invalid data and ensure data integrity

-- 1. Prevent duplicate rounds per session
-- Ensures each session can only have one round with a given round_number
ALTER TABLE game_rounds
ADD CONSTRAINT unique_session_round UNIQUE(session_id, round_number);

-- 2. Ensure elapsed_seconds is valid (0-30 seconds for track preview length)
-- Prevents negative times and times beyond the max track preview length
ALTER TABLE game_rounds
ADD CONSTRAINT valid_elapsed_seconds CHECK (
  elapsed_seconds IS NULL OR
  (elapsed_seconds >= 0 AND elapsed_seconds <= 30)
);

-- 3. Ensure judged rounds have complete judgment data
-- If a round has been judged (correct is set), it must have points_awarded
-- If a round hasn't been judged, both should be null
ALTER TABLE game_rounds
ADD CONSTRAINT judged_rounds_have_points CHECK (
  (correct IS NULL AND points_awarded IS NULL) OR
  (correct IS NOT NULL AND points_awarded IS NOT NULL)
);

-- 4. Ensure valid game states
-- Prevents invalid state values from being inserted
ALTER TABLE game_sessions
ADD CONSTRAINT valid_game_state CHECK (
  state IN ('lobby', 'playing', 'buzzed', 'reveal', 'finished')
);

-- 5. Ensure valid current_round values
-- current_round should be between 0 (lobby) and 50 (max rounds)
ALTER TABLE game_sessions
ADD CONSTRAINT valid_current_round CHECK (
  current_round >= 0 AND current_round <= 50
);

-- 6. Ensure player scores are reasonable
-- Prevent extremely negative or positive scores that indicate data corruption
ALTER TABLE players
ADD CONSTRAINT reasonable_score CHECK (
  score >= -1000 AND score <= 10000
);

-- Add comments for documentation
COMMENT ON CONSTRAINT unique_session_round ON game_rounds IS
  'Prevents duplicate round numbers within a single game session';

COMMENT ON CONSTRAINT valid_elapsed_seconds ON game_rounds IS
  'Ensures elapsed time is within valid range (0-30 seconds for Spotify track previews)';

COMMENT ON CONSTRAINT judged_rounds_have_points ON game_rounds IS
  'Ensures data consistency: if round is judged, points must be awarded';

COMMENT ON CONSTRAINT valid_game_state ON game_sessions IS
  'Ensures game state is one of the valid state machine states';

COMMENT ON CONSTRAINT valid_current_round ON game_sessions IS
  'Ensures current_round is within valid range (0 for lobby, 1-50 for active rounds)';

COMMENT ON CONSTRAINT reasonable_score ON players IS
  'Prevents unrealistic scores that would indicate data corruption';
