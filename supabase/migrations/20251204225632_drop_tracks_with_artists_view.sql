-- Drop tracks_with_artists view and helper functions
-- These were backward compatibility layers for the artist normalization migration
-- Code has been migrated to use the normalized schema directly

-- Drop the view first (depends on the functions)
DROP VIEW IF EXISTS tracks_with_artists;

-- Drop the three helper functions
DROP FUNCTION IF EXISTS get_track_artists(uuid);
DROP FUNCTION IF EXISTS get_track_genres(uuid);
DROP FUNCTION IF EXISTS get_track_primary_genre(uuid);

-- Log success
DO $$
BEGIN
  RAISE NOTICE ' Backward compatibility layer removed';
  RAISE NOTICE '  - Dropped view: tracks_with_artists';
  RAISE NOTICE '  - Dropped function: get_track_artists(uuid)';
  RAISE NOTICE '  - Dropped function: get_track_genres(uuid)';
  RAISE NOTICE '  - Dropped function: get_track_primary_genre(uuid)';
  RAISE NOTICE '';
  RAISE NOTICE '  All code now uses the normalized schema directly:';
  RAISE NOTICE '    tracks -> track_artists -> artists';
END $$;
