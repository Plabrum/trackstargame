-- Part 2: Migrate data from denormalized to normalized schema
-- This migration deduplicates tracks intelligently, keeping the best metadata

-- Step 1: Insert deduplicated tracks into tracks_new
-- Selection strategy:
--   1. Keep track with longest genres array (most genre data)
--   2. If tied, keep track with most non-null metadata fields
--   3. If still tied, keep newest (latest created_at)

WITH ranked_tracks AS (
  SELECT
    *,
    -- Rank by: genres array length (DESC), non-null count (DESC), created_at (DESC)
    ROW_NUMBER() OVER (
      PARTITION BY spotify_id
      ORDER BY
        array_length(genres, 1) DESC NULLS LAST,
        -- Count non-null metadata fields
        (
          CASE WHEN album_name IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN release_year IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN primary_genre IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN spotify_popularity IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN isrc IS NOT NULL THEN 1 ELSE 0 END
        ) DESC,
        created_at DESC
    ) as rank
  FROM tracks
)
INSERT INTO tracks_new (
  id,
  spotify_id,
  title,
  artist,
  album_name,
  release_year,
  primary_genre,
  genres,
  spotify_popularity,
  isrc,
  created_at,
  updated_at
)
SELECT
  id,
  spotify_id,
  title,
  artist,
  album_name,
  release_year,
  primary_genre,
  genres,
  spotify_popularity,
  isrc,
  created_at,
  created_at as updated_at
FROM ranked_tracks
WHERE rank = 1;

-- Step 2: Create pack-track associations
-- Map ALL original track records to their deduplicated track in tracks_new
-- IMPORTANT: Deduplicate here - same song may appear multiple times in same pack in old schema
-- Keep the first occurrence (lowest position) of each unique (pack_id, track_id) pair

WITH track_mappings AS (
  SELECT
    old.pack_id,
    new.id as track_id,
    MIN(old.created_at) as first_occurrence
  FROM tracks old
  JOIN tracks_new new ON new.spotify_id = old.spotify_id
  WHERE old.pack_id IS NOT NULL
  GROUP BY old.pack_id, new.id
),
ranked_tracks AS (
  SELECT
    pack_id,
    track_id,
    ROW_NUMBER() OVER (PARTITION BY pack_id ORDER BY first_occurrence) as position
  FROM track_mappings
)
INSERT INTO pack_tracks (pack_id, track_id, position)
SELECT pack_id, track_id, position
FROM ranked_tracks;

-- Step 3: Remap game_rounds to point to deduplicated tracks
-- CRITICAL: game_rounds.track_id references tracks.id
-- We need to update these to point to the new deduplicated track_ids
-- Skip NULL track_ids (from early test games)

UPDATE game_rounds gr
SET track_id = new.id
FROM tracks old
JOIN tracks_new new ON new.spotify_id = old.spotify_id
WHERE gr.track_id = old.id
  AND gr.track_id IS NOT NULL;

-- Step 4: Verify migration
-- These counts should match for data integrity

DO $$
DECLARE
  original_count integer;
  new_track_count integer;
  association_count integer;
  unique_spotify_count integer;
  game_rounds_count integer;
  orphaned_rounds integer;
BEGIN
  -- Count original tracks
  SELECT COUNT(*) INTO original_count FROM tracks;

  -- Count new deduplicated tracks
  SELECT COUNT(*) INTO new_track_count FROM tracks_new;

  -- Count pack-track associations
  SELECT COUNT(*) INTO association_count FROM pack_tracks;

  -- Count unique spotify_ids in original
  SELECT COUNT(DISTINCT spotify_id) INTO unique_spotify_count FROM tracks;

  -- Count game rounds
  SELECT COUNT(*) INTO game_rounds_count FROM game_rounds;

  -- Check for orphaned game rounds (shouldn't exist after remapping)
  -- Only check non-NULL track_ids (NULL is allowed for early test games)
  SELECT COUNT(*) INTO orphaned_rounds
  FROM game_rounds gr
  WHERE gr.track_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM tracks_new WHERE id = gr.track_id);

  -- Validation checks
  IF new_track_count != unique_spotify_count THEN
    RAISE EXCEPTION 'Migration failed: tracks_new count (%) does not match unique spotify_ids (%)',
      new_track_count, unique_spotify_count;
  END IF;

  -- Note: pack_tracks may have fewer rows than original tracks due to deduplication
  -- (same song appearing multiple times in same pack in old schema)
  IF association_count > original_count THEN
    RAISE EXCEPTION 'Migration failed: pack_tracks count (%) exceeds original tracks (%)',
      association_count, original_count;
  END IF;

  IF orphaned_rounds > 0 THEN
    RAISE EXCEPTION 'Migration failed: % game_rounds still reference old track_ids',
      orphaned_rounds;
  END IF;

  -- Success message
  RAISE NOTICE '✓ Migration successful!';
  RAISE NOTICE '  - Deduplicated % tracks down to % unique songs', original_count, new_track_count;
  RAISE NOTICE '  - Created % pack-track associations (% fewer due to duplicate songs in packs)',
    association_count, original_count - association_count;
  RAISE NOTICE '  - Remapped % game rounds to new track_ids', game_rounds_count;

  IF original_count > 0 THEN
    RAISE NOTICE '  - Removed % duplicate records (%.1f%% savings)',
      original_count - new_track_count,
      ((original_count - new_track_count)::float / original_count * 100);
  ELSE
    RAISE NOTICE '  - No tracks to migrate (empty database)';
  END IF;
END $$;
