-- Part 3: Add constraints and indexes
-- This migration adds all constraints after data is migrated

-- Add UNIQUE constraint on spotify_id (enforce no duplicates)
ALTER TABLE tracks_new
  ADD CONSTRAINT tracks_new_spotify_id_unique UNIQUE (spotify_id);

-- Add CHECK constraint on spotify_popularity
ALTER TABLE tracks_new
  ADD CONSTRAINT tracks_new_spotify_popularity_range
  CHECK (spotify_popularity >= 0 AND spotify_popularity <= 100);

-- Add NOT NULL constraint on pack_tracks foreign keys
ALTER TABLE pack_tracks
  ALTER COLUMN pack_id SET NOT NULL;

ALTER TABLE pack_tracks
  ALTER COLUMN track_id SET NOT NULL;

-- Add foreign key to packs table (with cascading delete)
ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_pack_id_fkey
  FOREIGN KEY (pack_id)
  REFERENCES packs(id)
  ON DELETE CASCADE;

-- Add foreign key to tracks_new table (with cascading delete)
ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_track_id_fkey
  FOREIGN KEY (track_id)
  REFERENCES tracks_new(id)
  ON DELETE CASCADE;

-- Add UNIQUE constraint to prevent same track twice in one pack
ALTER TABLE pack_tracks
  ADD CONSTRAINT pack_tracks_pack_track_unique
  UNIQUE (pack_id, track_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_new_spotify_id
  ON tracks_new(spotify_id);

CREATE INDEX IF NOT EXISTS idx_tracks_new_spotify_popularity
  ON tracks_new(spotify_popularity DESC);

CREATE INDEX IF NOT EXISTS idx_tracks_new_isrc
  ON tracks_new(isrc);

CREATE INDEX IF NOT EXISTS idx_pack_tracks_pack_id
  ON pack_tracks(pack_id);

CREATE INDEX IF NOT EXISTS idx_pack_tracks_track_id
  ON pack_tracks(track_id);

CREATE INDEX IF NOT EXISTS idx_pack_tracks_position
  ON pack_tracks(pack_id, position);

-- Add updated_at trigger for tracks_new
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tracks_new_updated_at
  BEFORE UPDATE ON tracks_new
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Added all constraints and indexes successfully';
END $$;
