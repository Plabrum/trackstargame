-- Add game settings columns to game_sessions table
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS allow_host_to_play BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS allow_single_user BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 10 NOT NULL;

-- Add constraint to ensure total_rounds is between 1 and 50
ALTER TABLE game_sessions
ADD CONSTRAINT total_rounds_range CHECK (total_rounds >= 1 AND total_rounds <= 50);

-- Add comment to document these columns
COMMENT ON COLUMN game_sessions.allow_host_to_play IS 'Whether the host can participate as a player';
COMMENT ON COLUMN game_sessions.allow_single_user IS 'Whether the game can be played solo';
COMMENT ON COLUMN game_sessions.total_rounds IS 'Number of rounds in this game session';
