-- Remove backup columns from tracks table
-- These were created during the artist normalization migration as a safety measure
-- Now that the migration is validated and stable, we can remove them

-- Drop the three backup columns
ALTER TABLE tracks DROP COLUMN IF EXISTS artist_backup;
ALTER TABLE tracks DROP COLUMN IF EXISTS genres_backup;
ALTER TABLE tracks DROP COLUMN IF EXISTS primary_genre_backup;

-- Add comment to tracks table documenting the cleanup
COMMENT ON TABLE tracks IS 'Track metadata from Spotify. Artist data is normalized in the artists and track_artists tables. Use the tracks_with_artists view for a backward-compatible interface with artist and genre fields computed from the normalized data.';
