-- Migration: Artist & Genre Normalization - Part 1: Create Tables
-- Description: Creates artists and track_artists tables to normalize artist data
-- and move genre storage to the artist level (matching Spotify's data model)

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  spotify_artist_id   text UNIQUE,
  genres              text[],
  spotify_followers   int,
  image_url           text,
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now()
);

-- Create track_artists junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS track_artists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id   uuid NOT NULL,
  artist_id  uuid NOT NULL,
  position   int NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add table comments
COMMENT ON TABLE artists IS 'Unique artists with Spotify metadata and genre arrays';
COMMENT ON TABLE track_artists IS 'Many-to-many junction table linking tracks to artists';

-- Add column comments
COMMENT ON COLUMN artists.name IS 'Artist name (not unique - duplicates resolved via Spotify enrichment)';
COMMENT ON COLUMN artists.spotify_artist_id IS 'Spotify artist ID (unique when populated)';
COMMENT ON COLUMN artists.genres IS 'Array of genre strings from Spotify artist data';
COMMENT ON COLUMN artists.spotify_followers IS 'Spotify follower count for popularity metrics';
COMMENT ON COLUMN artists.image_url IS 'Spotify artist profile image URL';

COMMENT ON COLUMN track_artists.position IS 'Artist order in multi-artist tracks (1-based, preserves "Queen, Bowie" ordering)';

-- Create initial indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_name_lower ON artists(lower(name));
CREATE INDEX IF NOT EXISTS idx_track_artists_track_id ON track_artists(track_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_artist_id ON track_artists(artist_id);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Part 1 complete: artists and track_artists tables created';
END $$;
