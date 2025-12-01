-- Migration: Artist & Genre Normalization - Part 5: Finalize
-- Description: Backup and drop old artist/genre columns from tracks table
-- WARNING: This is a breaking change! Run only after application code is updated.

-- Step 1: Create backup columns for safety
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artist_backup text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS genres_backup text[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS primary_genre_backup text;

-- Step 2: Copy data to backup columns
UPDATE tracks SET
  artist_backup = artist,
  genres_backup = genres,
  primary_genre_backup = primary_genre;

-- Log backup completion
DO $$
DECLARE
  backup_count integer;
BEGIN
  SELECT COUNT(*) INTO backup_count
  FROM tracks
  WHERE artist_backup IS NOT NULL;

  RAISE NOTICE 'Step 1-2: Backed up data from % tracks', backup_count;
END $$;

-- Step 3: Drop old columns
ALTER TABLE tracks DROP COLUMN IF EXISTS artist;
ALTER TABLE tracks DROP COLUMN IF EXISTS genres;
ALTER TABLE tracks DROP COLUMN IF EXISTS primary_genre;

-- Final validation and success message
DO $$
DECLARE
  total_tracks integer;
  total_artists integer;
  total_links integer;
  tracks_with_backup integer;
BEGIN
  SELECT COUNT(*) INTO total_tracks FROM tracks;
  SELECT COUNT(*) INTO total_artists FROM artists;
  SELECT COUNT(*) INTO total_links FROM track_artists;
  SELECT COUNT(*) INTO tracks_with_backup
  FROM tracks
  WHERE artist_backup IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Schema Changes:';
  RAISE NOTICE '  - Removed: tracks.artist';
  RAISE NOTICE '  - Removed: tracks.genres';
  RAISE NOTICE '  - Removed: tracks.primary_genre';
  RAISE NOTICE '  - Added: artists table (% records)', total_artists;
  RAISE NOTICE '  - Added: track_artists table (% links)', total_links;
  RAISE NOTICE '';
  RAISE NOTICE 'Backwards Compatibility:';
  RAISE NOTICE '  - Use tracks_with_artists view';
  RAISE NOTICE '  - Or call get_track_artists(track_id)';
  RAISE NOTICE '  - Or call get_track_genres(track_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Backup:';
  RAISE NOTICE '  - % tracks backed up', tracks_with_backup;
  RAISE NOTICE '  - Backup columns: artist_backup, genres_backup, primary_genre_backup';
  RAISE NOTICE '  - Remove backups after 1 week if no issues';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy updated application code';
  RAISE NOTICE '  2. Run Spotify enrichment scripts:';
  RAISE NOTICE '     - scripts/fetch_artist_metadata.py';
  RAISE NOTICE '     - scripts/apply_artist_enrichment.py';
  RAISE NOTICE '  3. Monitor for issues';
  RAISE NOTICE '  4. Remove backup columns after 1 week';
  RAISE NOTICE '========================================';
END $$;
