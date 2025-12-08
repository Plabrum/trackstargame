-- Add unique constraint on player name (temporary until spotify_user_id is implemented)
-- This prevents name spoofing on leaderboards

ALTER TABLE players ADD CONSTRAINT players_name_key UNIQUE (name);

COMMENT ON CONSTRAINT players_name_key ON players IS
  'Temporary global unique constraint on player names. Will be replaced with spotify_user_id-based identification.';
