-- Part 1: Create new normalized schema
-- This migration creates the new tracks and pack_tracks tables without touching existing data

-- Create new tracks table (without pack_id)
CREATE TABLE IF NOT EXISTS tracks_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id text NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  album_name text,
  release_year integer,
  primary_genre text,
  genres text[],
  spotify_popularity integer,
  isrc text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create pack_tracks junction table
CREATE TABLE IF NOT EXISTS pack_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL,
  track_id uuid NOT NULL,
  position integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Add helpful comments
COMMENT ON TABLE tracks_new IS 'Deduplicated tracks table - one row per unique song';
COMMENT ON TABLE pack_tracks IS 'Junction table linking packs to tracks (many-to-many)';
COMMENT ON COLUMN tracks_new.spotify_id IS 'Spotify track ID - will be unique after migration';
COMMENT ON COLUMN tracks_new.genres IS 'Array of genre tags from Spotify';
COMMENT ON COLUMN pack_tracks.position IS 'Display order of track within pack';
