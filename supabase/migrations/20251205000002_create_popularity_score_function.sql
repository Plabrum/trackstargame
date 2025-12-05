-- Function to calculate combined popularity score (0-100) for a track
-- Combines track popularity (0-100) with normalized artist followers
-- Used for difficulty-based track filtering

CREATE OR REPLACE FUNCTION calculate_track_popularity_score(p_track_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_track_popularity NUMERIC;
  v_max_artist_followers NUMERIC;
  v_normalized_artist_score NUMERIC;
  v_combined_score NUMERIC;
BEGIN
  -- Get track's spotify_popularity (already 0-100)
  SELECT COALESCE(spotify_popularity, 50) INTO v_track_popularity
  FROM tracks
  WHERE id = p_track_id;

  -- Get max artist followers for this track
  -- Using MAX because primary artist's popularity matters most
  SELECT COALESCE(MAX(a.spotify_followers), 0) INTO v_max_artist_followers
  FROM track_artists ta
  JOIN artists a ON a.id = ta.artist_id
  WHERE ta.track_id = p_track_id;

  -- Normalize artist followers to 0-100 scale using log scale
  -- Most popular artists have ~100M followers (e.g., Taylor Swift, Ed Sheeran)
  -- Using log10 to compress the range: log10(100M) ≈ 8
  -- Formula: min(100, (log10(followers + 1) / 8) * 100)
  IF v_max_artist_followers > 0 THEN
    v_normalized_artist_score := LEAST(
      100,
      (log(v_max_artist_followers + 1) / log(100000000)) * 100
    );
  ELSE
    -- Default to 50 if no follower data
    v_normalized_artist_score := 50;
  END IF;

  -- Combined score: weighted average (60% track popularity, 40% artist followers)
  -- Track popularity is more recent/accurate, so weighted higher
  v_combined_score := (v_track_popularity * 0.6) + (v_normalized_artist_score * 0.4);

  RETURN ROUND(v_combined_score, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_track_popularity_score(UUID) IS
'Calculates combined popularity score (0-100) from track popularity (60% weight) and artist followers (40% weight, log-normalized). Higher score = more popular. Returns 50 as default for missing data.';
