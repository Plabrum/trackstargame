-- Add metadata columns to tracks table for genre and year filtering
ALTER TABLE tracks
  ADD COLUMN release_year INTEGER,
  ADD COLUMN album_name TEXT,
  ADD COLUMN primary_genre TEXT;

-- Create indexes for efficient filtering
CREATE INDEX idx_tracks_release_year ON tracks(release_year);
CREATE INDEX idx_tracks_primary_genre ON tracks(primary_genre);

-- Add comment to explain the schema
COMMENT ON COLUMN tracks.release_year IS 'Year the track was released, extracted from Spotify album release_date';
COMMENT ON COLUMN tracks.album_name IS 'Name of the album the track appears on';
COMMENT ON COLUMN tracks.primary_genre IS 'Primary genre of the track, derived from the artist genres (first genre)';
