-- Part 4: Finalize migration - rename tables and backup old data
-- This migration makes the new schema live

-- Step 1: Drop old indexes (they'll move to tracks_old_backup with the table)
DROP INDEX IF EXISTS idx_tracks_spotify_id;
DROP INDEX IF EXISTS idx_tracks_spotify_popularity;
DROP INDEX IF EXISTS idx_tracks_isrc;

-- Step 2: Rename old tracks table to backup
ALTER TABLE tracks RENAME TO tracks_old_backup;

-- Step 3: Rename new tracks table to tracks
ALTER TABLE tracks_new RENAME TO tracks;

-- Step 4: Rename constraints to remove "_new" suffix
ALTER TABLE tracks
  RENAME CONSTRAINT tracks_new_spotify_id_unique TO tracks_spotify_id_unique;

ALTER TABLE tracks
  RENAME CONSTRAINT tracks_new_spotify_popularity_range TO tracks_spotify_popularity_range;

-- Step 5: Rename indexes to remove "_new" suffix
ALTER INDEX idx_tracks_new_spotify_id RENAME TO idx_tracks_spotify_id;
ALTER INDEX idx_tracks_new_spotify_popularity RENAME TO idx_tracks_spotify_popularity;
ALTER INDEX idx_tracks_new_isrc RENAME TO idx_tracks_isrc;

-- Step 6: Update trigger to reference correct table name
DROP TRIGGER IF EXISTS update_tracks_new_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comment on backup table
COMMENT ON TABLE tracks_old_backup IS 'Backup of denormalized tracks table before migration on 2025-12-01. Safe to drop after 1 week if no issues.';

-- Step 8: Final validation
DO $$
DECLARE
  tracks_count integer;
  pack_tracks_count integer;
  packs_without_tracks integer;
BEGIN
  SELECT COUNT(*) INTO tracks_count FROM tracks;
  SELECT COUNT(*) INTO pack_tracks_count FROM pack_tracks;

  -- Check for packs without tracks
  SELECT COUNT(*) INTO packs_without_tracks
  FROM packs p
  WHERE NOT EXISTS (
    SELECT 1 FROM pack_tracks pt WHERE pt.pack_id = p.id
  );

  -- Report final state
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  MIGRATION COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Final database state:';
  RAISE NOTICE '  - Tracks table: % unique songs', tracks_count;
  RAISE NOTICE '  - Pack-track associations: %', pack_tracks_count;
  RAISE NOTICE '  - Packs without tracks: %', packs_without_tracks;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Generate TypeScript types: pnpm db:generate-types';
  RAISE NOTICE '  2. Update application code (see NORMALIZATION_CODE_CHANGES.md)';
  RAISE NOTICE '  3. Test locally before deploying';
  RAISE NOTICE '';
  RAISE NOTICE 'Backup table "tracks_old_backup" can be dropped after 1 week';
  RAISE NOTICE '  DROP TABLE tracks_old_backup CASCADE;';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  IF packs_without_tracks > 0 THEN
    RAISE WARNING 'Found % packs without tracks - this may indicate an issue', packs_without_tracks;
  END IF;
END $$;
