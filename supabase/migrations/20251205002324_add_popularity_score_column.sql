-- Add popularity_score column to tracks table
-- This denormalizes the calculated popularity score to avoid expensive function calls in WHERE clauses

-- Step 1: Add the column (nullable initially)
ALTER TABLE tracks
ADD COLUMN popularity_score NUMERIC;

COMMENT ON COLUMN tracks.popularity_score IS 'Denormalized popularity score (0-100) calculated from track spotify_popularity (60%) and max artist followers (40%, log-normalized). Updated via trigger.';

-- Step 2: Backfill existing tracks with their popularity scores
-- This will use the existing calculate_track_popularity_score function
UPDATE tracks
SET popularity_score = calculate_track_popularity_score(id)
WHERE popularity_score IS NULL;

-- Step 3: Create trigger function to auto-update popularity_score
CREATE OR REPLACE FUNCTION update_track_popularity_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate popularity score whenever track or artist data changes
  NEW.popularity_score := calculate_track_popularity_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on tracks table
CREATE TRIGGER trigger_update_track_popularity_score
BEFORE INSERT OR UPDATE OF spotify_popularity
ON tracks
FOR EACH ROW
EXECUTE FUNCTION update_track_popularity_score();

-- Step 5: Create trigger on track_artists to update tracks when artist relationships change
CREATE OR REPLACE FUNCTION update_track_popularity_on_artist_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the track's popularity score when artist assignments change
  -- This handles both INSERT and UPDATE of track_artists
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE tracks
    SET popularity_score = calculate_track_popularity_score(NEW.track_id)
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET popularity_score = calculate_track_popularity_score(OLD.track_id)
    WHERE id = OLD.track_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_track_popularity_on_artist_change
AFTER INSERT OR UPDATE OR DELETE
ON track_artists
FOR EACH ROW
EXECUTE FUNCTION update_track_popularity_on_artist_change();

-- Step 6: Create trigger on artists to update tracks when follower counts change
CREATE OR REPLACE FUNCTION update_tracks_popularity_on_artist_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When artist follower count changes, update all tracks by this artist
  IF TG_OP = 'UPDATE' AND (OLD.spotify_followers IS DISTINCT FROM NEW.spotify_followers) THEN
    UPDATE tracks
    SET popularity_score = calculate_track_popularity_score(tracks.id)
    WHERE tracks.id IN (
      SELECT track_id
      FROM track_artists
      WHERE artist_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tracks_popularity_on_artist_update
AFTER UPDATE OF spotify_followers
ON artists
FOR EACH ROW
EXECUTE FUNCTION update_tracks_popularity_on_artist_update();

-- Step 7: Create index on popularity_score for efficient filtering
CREATE INDEX idx_tracks_popularity_score ON tracks(popularity_score)
WHERE popularity_score IS NOT NULL;

COMMENT ON INDEX idx_tracks_popularity_score IS 'Enables efficient filtering by difficulty ranges in start_game and advance_round';

-- Step 8: Add constraint to ensure valid score range
ALTER TABLE tracks
ADD CONSTRAINT tracks_popularity_score_range
CHECK (popularity_score IS NULL OR (popularity_score >= 0 AND popularity_score <= 100));
