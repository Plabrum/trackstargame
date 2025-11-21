-- Add genres array column to tracks table
ALTER TABLE tracks ADD COLUMN genres TEXT[];

-- Migrate existing primary_genre data to genres array
UPDATE tracks
SET genres = ARRAY[primary_genre]
WHERE primary_genre IS NOT NULL;

-- Create GIN index for efficient genre searching
CREATE INDEX idx_tracks_genres ON tracks USING GIN(genres);

-- Add comment for documentation
COMMENT ON COLUMN tracks.genres IS 'Array of genres for the track, from Spotify and/or Last.fm';
