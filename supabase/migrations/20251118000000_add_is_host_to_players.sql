-- Add is_host column to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT false NOT NULL;

-- Add comment
COMMENT ON COLUMN players.is_host IS 'Whether this player is the host (for solo mode)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_is_host ON players(session_id, is_host) WHERE is_host = true;
