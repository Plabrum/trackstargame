-- Add spotify_popularity column to tracks table
ALTER TABLE tracks
ADD COLUMN spotify_popularity INT;

-- Add constraint to ensure value is between 0-100
ALTER TABLE tracks
ADD CONSTRAINT spotify_popularity_range CHECK (spotify_popularity >= 0 AND spotify_popularity <= 100);

-- Create index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_tracks_spotify_popularity ON tracks(spotify_popularity DESC);

-- Add helpful comment
COMMENT ON COLUMN tracks.spotify_popularity IS 'Spotify popularity score (0-100), with 100 being most popular. Based on recent play counts from Spotify API.';
