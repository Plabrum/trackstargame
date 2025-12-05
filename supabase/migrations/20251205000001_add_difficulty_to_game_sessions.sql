-- Add difficulty column to game_sessions table
-- Difficulty levels: easy, medium, hard, legendary
-- Affects track selection based on popularity score

ALTER TABLE game_sessions
ADD COLUMN difficulty TEXT DEFAULT 'medium';

-- Add constraint to ensure valid values
ALTER TABLE game_sessions
ADD CONSTRAINT difficulty_valid_values
CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary'));

-- Create index for potential filtering/analytics
CREATE INDEX IF NOT EXISTS idx_game_sessions_difficulty
ON game_sessions(difficulty);

-- Add helpful comment
COMMENT ON COLUMN game_sessions.difficulty IS
'Difficulty level affecting track selection based on popularity:
- easy (70-100): Popular hits everyone knows
- medium (40-70): Balanced mix (default)
- hard (15-40): Deep cuts for music enthusiasts
- legendary (0-15): Ultra-obscure tracks, extreme challenge';
