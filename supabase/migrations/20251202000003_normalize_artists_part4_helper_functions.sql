-- Migration: Artist & Genre Normalization - Part 4: Helper Functions & Views
-- Description: Create helper functions and backwards-compatible view for accessing
-- artist and genre data through the new normalized schema

-- Function: Get all artists for a track (ordered by position)
CREATE OR REPLACE FUNCTION get_track_artists(p_track_id uuid)
RETURNS text AS $$
  SELECT string_agg(a.name, ', ' ORDER BY ta.position)
  FROM track_artists ta
  JOIN artists a ON a.id = ta.artist_id
  WHERE ta.track_id = p_track_id
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_track_artists(uuid) IS
  'Returns comma-separated artist names for a track, preserving original order';

-- Function: Get all genres for a track (from all artists, deduplicated)
CREATE OR REPLACE FUNCTION get_track_genres(p_track_id uuid)
RETURNS text[] AS $$
  SELECT array_agg(DISTINCT g ORDER BY g)
  FROM track_artists ta
  JOIN artists a ON a.id = ta.artist_id
  CROSS JOIN unnest(a.genres) AS g
  WHERE ta.track_id = p_track_id
    AND a.genres IS NOT NULL
    AND array_length(a.genres, 1) > 0
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_track_genres(uuid) IS
  'Returns deduplicated array of all genres from all artists of a track';

-- Function: Get primary genre (first artist's first genre)
CREATE OR REPLACE FUNCTION get_track_primary_genre(p_track_id uuid)
RETURNS text AS $$
  SELECT a.genres[1]
  FROM track_artists ta
  JOIN artists a ON a.id = ta.artist_id
  WHERE ta.track_id = p_track_id
    AND ta.position = 1
    AND a.genres IS NOT NULL
    AND array_length(a.genres, 1) > 0
  LIMIT 1
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_track_primary_genre(uuid) IS
  'Returns the first genre of the first (primary) artist for a track';

-- View: Backwards-compatible tracks with artist data
CREATE OR REPLACE VIEW tracks_with_artists AS
SELECT
  t.id,
  t.spotify_id,
  t.title,
  get_track_artists(t.id) as artist,
  t.album_name,
  t.release_year,
  get_track_primary_genre(t.id) as primary_genre,
  get_track_genres(t.id) as genres,
  t.spotify_popularity,
  t.isrc,
  t.created_at,
  t.updated_at
FROM tracks t;

COMMENT ON VIEW tracks_with_artists IS
  'Backwards-compatible view providing artist, genres, and primary_genre columns computed from normalized artist data. Use this view in application code that expects the old schema.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Part 4 complete: Helper functions and views created';
  RAISE NOTICE '  Functions:';
  RAISE NOTICE '    - get_track_artists(track_id) → comma-separated artist names';
  RAISE NOTICE '    - get_track_genres(track_id) → array of genres from all artists';
  RAISE NOTICE '    - get_track_primary_genre(track_id) → first artist''s first genre';
  RAISE NOTICE '  Views:';
  RAISE NOTICE '    - tracks_with_artists → backwards-compatible interface';
  RAISE NOTICE '';
  RAISE NOTICE '  Usage example:';
  RAISE NOTICE '    SELECT * FROM tracks_with_artists WHERE id = ''some-uuid'';';
END $$;
