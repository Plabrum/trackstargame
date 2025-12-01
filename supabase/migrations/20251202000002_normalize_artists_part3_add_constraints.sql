-- Migration: Artist & Genre Normalization - Part 3: Add Constraints & Indexes
-- Description: Add foreign keys, unique constraints, and performance indexes

-- Foreign key constraints with CASCADE delete
ALTER TABLE track_artists
  ADD CONSTRAINT track_artists_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE track_artists
  ADD CONSTRAINT track_artists_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- Unique constraints
-- Prevent duplicate track-artist associations
ALTER TABLE track_artists
  ADD CONSTRAINT track_artists_track_artist_unique
  UNIQUE (track_id, artist_id);

-- Prevent duplicate positions within a track
ALTER TABLE track_artists
  ADD CONSTRAINT track_artists_track_position_unique
  UNIQUE (track_id, position);

-- Check constraints
-- Ensure position is positive (1-based indexing)
ALTER TABLE track_artists
  ADD CONSTRAINT track_artists_position_positive
  CHECK (position > 0);

-- Performance indexes

-- Artists table indexes
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_artist_id)
  WHERE spotify_artist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artists_genres ON artists USING gin(genres)
  WHERE genres IS NOT NULL;

-- Track_artists table indexes
CREATE INDEX IF NOT EXISTS idx_track_artists_position ON track_artists(track_id, position);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Part 3 complete: Constraints and indexes added';
  RAISE NOTICE '  - Foreign keys: track_artists → tracks, artists';
  RAISE NOTICE '  - Unique constraints: (track_id, artist_id), (track_id, position)';
  RAISE NOTICE '  - Check constraint: position > 0';
  RAISE NOTICE '  - Performance indexes: spotify_artist_id, genres (GIN), position';
END $$;
