-- Add spotify_user_id to players table for user identification
-- This allows tracking personal bests across multiple games

ALTER TABLE players ADD COLUMN spotify_user_id TEXT;

-- Index for efficient leaderboard queries
CREATE INDEX idx_players_spotify_user_id ON players (spotify_user_id) WHERE spotify_user_id IS NOT NULL;

COMMENT ON COLUMN players.spotify_user_id IS
  'Spotify user ID for authenticated hosts. Allows tracking personal bests and preventing name spoofing on leaderboards.';
