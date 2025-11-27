-- Add isrc (International Standard Recording Code) column to tracks table
ALTER TABLE tracks
ADD COLUMN isrc TEXT;

-- Create index for lookups by ISRC (useful for deduplication and external integrations)
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc);

-- Add helpful comment
COMMENT ON COLUMN tracks.isrc IS 'International Standard Recording Code - unique identifier for sound recordings and music video recordings.';
