-- Update tracks table to use spotify_id instead of preview_url
-- This allows us to use Spotify Web Playback SDK for full track playback

-- Rename the column and update its purpose
ALTER TABLE tracks RENAME COLUMN preview_url TO spotify_id;

-- Update the comment
COMMENT ON COLUMN tracks.spotify_id IS 'Spotify track ID for playback via Spotify Web Playback SDK';

-- Add index for spotify_id lookups
CREATE INDEX idx_tracks_spotify_id ON tracks(spotify_id);
