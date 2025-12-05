-- Add 'submitted' state to valid_game_state check constraint
-- This state is used in text input mode when all players have submitted answers

ALTER TABLE game_sessions
  DROP CONSTRAINT IF EXISTS valid_game_state;

ALTER TABLE game_sessions
  ADD CONSTRAINT valid_game_state
  CHECK (state = ANY (ARRAY['lobby'::text, 'playing'::text, 'buzzed'::text, 'reveal'::text, 'submitted'::text, 'finished'::text]));
