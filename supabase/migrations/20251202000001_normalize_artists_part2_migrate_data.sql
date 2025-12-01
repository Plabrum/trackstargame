-- Migration: Artist & Genre Normalization - Part 2: Migrate Data
-- Description: Parse comma-separated artist strings from tracks, create unique artists,
-- and populate track_artists junction table with proper ordering

-- Step 1: Extract unique artist names from tracks
CREATE TEMP TABLE unique_artist_names AS
WITH artist_splits AS (
  SELECT DISTINCT
    trim(unnest(string_to_array(artist, ','))) as artist_name
  FROM tracks
  WHERE artist IS NOT NULL AND artist != ''
)
SELECT
  artist_name,
  lower(trim(artist_name)) as normalized_name
FROM artist_splits
WHERE artist_name IS NOT NULL
  AND artist_name != ''
  AND trim(artist_name) != '';

-- Log extracted artists count
DO $$
DECLARE
  unique_count integer;
BEGIN
  SELECT COUNT(*) INTO unique_count FROM unique_artist_names;
  RAISE NOTICE 'Step 1: Extracted % unique artist names from tracks', unique_count;
END $$;

-- Step 2: Insert unique artists (case-insensitive deduplication)
WITH deduplicated_artists AS (
  SELECT DISTINCT ON (normalized_name)
    artist_name,
    normalized_name
  FROM unique_artist_names
  ORDER BY normalized_name, artist_name
)
INSERT INTO artists (name)
SELECT artist_name
FROM deduplicated_artists
ORDER BY artist_name;

-- Log created artists
DO $$
DECLARE
  artist_count integer;
BEGIN
  SELECT COUNT(*) INTO artist_count FROM artists;
  RAISE NOTICE 'Step 2: Created % unique artist records', artist_count;
END $$;

-- Step 3: Populate track_artists junction table
-- This preserves artist ordering: "Queen, David Bowie" → Queen (position 1), Bowie (position 2)
WITH track_artist_splits AS (
  SELECT
    t.id as track_id,
    trim(split_artists.artist_name) as artist_name,
    split_artists.position
  FROM tracks t
  CROSS JOIN LATERAL
    unnest(string_to_array(t.artist, ',')) WITH ORDINALITY AS split_artists(artist_name, position)
  WHERE t.artist IS NOT NULL AND t.artist != ''
)
INSERT INTO track_artists (track_id, artist_id, position)
SELECT
  tas.track_id,
  a.id as artist_id,
  tas.position
FROM track_artist_splits tas
JOIN artists a ON lower(trim(tas.artist_name)) = lower(trim(a.name))
ON CONFLICT DO NOTHING;

-- Step 4: Validation
DO $$
DECLARE
  total_tracks integer;
  tracks_with_artists integer;
  total_artists integer;
  total_links integer;
  tracks_missing_artists integer;
  avg_artists_per_track numeric;
BEGIN
  SELECT COUNT(*) INTO total_tracks FROM tracks;
  SELECT COUNT(DISTINCT track_id) INTO tracks_with_artists FROM track_artists;
  SELECT COUNT(*) INTO total_artists FROM artists;
  SELECT COUNT(*) INTO total_links FROM track_artists;
  SELECT ROUND(AVG(artist_count)::numeric, 2) INTO avg_artists_per_track
  FROM (
    SELECT track_id, COUNT(*) as artist_count
    FROM track_artists
    GROUP BY track_id
  ) sub;

  SELECT COUNT(*) INTO tracks_missing_artists
  FROM tracks t
  LEFT JOIN track_artists ta ON ta.track_id = t.id
  WHERE ta.id IS NULL AND t.artist IS NOT NULL AND t.artist != '';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Artist migration successful!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Total tracks:            %', total_tracks;
  RAISE NOTICE '  Tracks with artists:     %', tracks_with_artists;
  RAISE NOTICE '  Unique artists created:  %', total_artists;
  RAISE NOTICE '  Track-artist links:      %', total_links;
  RAISE NOTICE '  Avg artists per track:   %', avg_artists_per_track;
  RAISE NOTICE '========================================';

  IF tracks_missing_artists > 0 THEN
    RAISE WARNING '⚠️  WARNING: % tracks are missing artist links!', tracks_missing_artists;
    RAISE WARNING '    This may indicate parsing issues. Review tracks without artist associations.';
  ELSE
    RAISE NOTICE '✓ All tracks successfully linked to artists';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Drop temp table
DROP TABLE IF EXISTS unique_artist_names;
