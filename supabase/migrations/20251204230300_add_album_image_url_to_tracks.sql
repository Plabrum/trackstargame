-- Add album_image_url column to tracks table
-- This will store the Spotify album artwork URL for display in game UI

ALTER TABLE tracks
ADD COLUMN album_image_url text;

-- Add index for potential future queries filtering by image availability
CREATE INDEX idx_tracks_has_image ON tracks (album_image_url) WHERE album_image_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tracks.album_image_url IS 'URL to album artwork from Spotify. Used for displaying album art in game UI and player views.';
