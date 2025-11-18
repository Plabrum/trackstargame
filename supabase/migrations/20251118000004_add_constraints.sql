-- Unique constraint: only one buzzer per round
CREATE UNIQUE INDEX unique_buzzer_per_round
  ON game_rounds (session_id, round_number)
  WHERE buzzer_player_id IS NOT NULL;

COMMENT ON INDEX unique_buzzer_per_round IS
  'Prevents race condition: ensures only one player can buzz per round';

-- Constraint: total_rounds must be reasonable
ALTER TABLE game_sessions
  ADD CONSTRAINT valid_total_rounds CHECK (total_rounds BETWEEN 1 AND 50);

-- Constraint: round_number must be positive
ALTER TABLE game_rounds
  ADD CONSTRAINT positive_round_number CHECK (round_number > 0);
