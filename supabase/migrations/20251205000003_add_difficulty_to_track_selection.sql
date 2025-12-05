-- Add difficulty-based filtering to track selection
-- Updates start_game and advance_round functions to filter tracks by popularity score

CREATE OR REPLACE FUNCTION start_game(p_session_id UUID)
RETURNS TABLE(
  id UUID,
  state TEXT,
  current_round INT,
  first_track_id UUID
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_player_count INT;
  v_track_id UUID;
  v_host_player_id UUID;
  v_difficulty TEXT;
  v_min_popularity NUMERIC;
  v_max_popularity NUMERIC;
BEGIN
  -- Get session (now includes difficulty)
  SELECT * INTO v_session FROM game_sessions WHERE game_sessions.id = p_session_id;

  IF v_session.state != 'lobby' THEN
    RAISE EXCEPTION 'Game can only be started from lobby state';
  END IF;

  v_difficulty := v_session.difficulty;

  -- Define difficulty ranges based on popularity score
  -- Easy: 70-100 (very popular tracks)
  -- Medium: 40-70 (moderately popular)
  -- Hard: 15-40 (less known)
  -- Legendary: 0-15 (obscure tracks)
  CASE v_difficulty
    WHEN 'easy' THEN
      v_min_popularity := 70;
      v_max_popularity := 100;
    WHEN 'medium' THEN
      v_min_popularity := 40;
      v_max_popularity := 70;
    WHEN 'hard' THEN
      v_min_popularity := 15;
      v_max_popularity := 40;
    WHEN 'legendary' THEN
      v_min_popularity := 0;
      v_max_popularity := 15;
    ELSE
      -- Default to medium if somehow invalid
      v_min_popularity := 40;
      v_max_popularity := 70;
  END CASE;

  -- Count players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE session_id = p_session_id;

  -- Create host player if needed (unchanged logic)
  IF v_session.allow_host_to_play THEN
    SELECT id INTO v_host_player_id FROM players
    WHERE session_id = p_session_id AND is_host = true
    LIMIT 1;

    IF v_host_player_id IS NULL THEN
      INSERT INTO players (session_id, name, is_host, score)
      VALUES (p_session_id, v_session.host_name, true, 0)
      RETURNING players.id INTO v_host_player_id;
      v_player_count := v_player_count + 1;
    END IF;
  END IF;

  -- Validate minimum player count
  IF v_player_count < 1 THEN
    RAISE EXCEPTION 'Need at least 1 player to start';
  END IF;

  -- Progressive fallback track selection with difficulty filter
  -- Attempt 1: Strict difficulty range
  SELECT t.id INTO v_track_id
  FROM tracks t
  JOIN pack_tracks pt ON pt.track_id = t.id
  WHERE pt.pack_id = v_session.pack_id
    AND calculate_track_popularity_score(t.id) BETWEEN v_min_popularity AND v_max_popularity
  ORDER BY RANDOM()
  LIMIT 1;

  -- Attempt 2: Expand range by ±15 if no tracks found
  IF v_track_id IS NULL THEN
    RAISE NOTICE 'No tracks in strict difficulty range [%-%), expanding...', v_min_popularity, v_max_popularity;

    SELECT t.id INTO v_track_id
    FROM tracks t
    JOIN pack_tracks pt ON pt.track_id = t.id
    WHERE pt.pack_id = v_session.pack_id
      AND calculate_track_popularity_score(t.id) BETWEEN
        GREATEST(0, v_min_popularity - 15) AND
        LEAST(100, v_max_popularity + 15)
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Attempt 3: Any track from pack (ultimate fallback)
  IF v_track_id IS NULL THEN
    RAISE WARNING 'No tracks in expanded difficulty range, selecting any track from pack';

    SELECT t.id INTO v_track_id
    FROM tracks t
    JOIN pack_tracks pt ON pt.track_id = t.id
    WHERE pt.pack_id = v_session.pack_id
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'Pack has no available tracks';
  END IF;

  -- Create first round
  INSERT INTO game_rounds (session_id, round_number, track_id)
  VALUES (p_session_id, 1, v_track_id);

  -- Update session
  UPDATE game_sessions
  SET state = 'playing', current_round = 1, round_start_time = NOW()
  WHERE game_sessions.id = p_session_id;

  -- Return result
  RETURN QUERY
  SELECT v_session.id, 'playing'::TEXT, 1, v_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update advance_round to include difficulty filtering
CREATE OR REPLACE FUNCTION advance_round(p_session_id UUID)
RETURNS TABLE(
  session_id UUID,
  new_state TEXT,
  new_round INT,
  track_id UUID
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_next_round INT;
  v_track_id UUID;
  v_difficulty TEXT;
  v_min_popularity NUMERIC;
  v_max_popularity NUMERIC;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;

  IF v_session.state != 'reveal' THEN
    RAISE EXCEPTION 'Can only advance from reveal state';
  END IF;

  v_next_round := v_session.current_round + 1;
  v_difficulty := v_session.difficulty;

  -- Check if game is over
  IF v_next_round > v_session.total_rounds THEN
    UPDATE game_sessions SET state = 'finished' WHERE id = p_session_id;
    RETURN QUERY SELECT p_session_id, 'finished'::TEXT, v_session.current_round, NULL::UUID;
    RETURN;
  END IF;

  -- Set difficulty ranges (same as start_game)
  CASE v_difficulty
    WHEN 'easy' THEN
      v_min_popularity := 70;
      v_max_popularity := 100;
    WHEN 'medium' THEN
      v_min_popularity := 40;
      v_max_popularity := 70;
    WHEN 'hard' THEN
      v_min_popularity := 15;
      v_max_popularity := 40;
    WHEN 'legendary' THEN
      v_min_popularity := 0;
      v_max_popularity := 15;
    ELSE
      v_min_popularity := 40;
      v_max_popularity := 70;
  END CASE;

  -- Attempt 1: Unused track within difficulty range, preferring unused artists
  SELECT t.id INTO v_track_id
  FROM tracks t
  JOIN pack_tracks pt ON pt.track_id = t.id
  WHERE pt.pack_id = v_session.pack_id
    -- Exclude already used tracks
    AND t.id NOT IN (
      SELECT gr.track_id
      FROM game_rounds gr
      WHERE gr.session_id = p_session_id
    )
    -- Difficulty filter
    AND calculate_track_popularity_score(t.id) BETWEEN v_min_popularity AND v_max_popularity
    -- Prefer artists not yet used (using helper function)
    AND get_track_artists(t.id) NOT IN (
      SELECT DISTINCT get_track_artists(t2.id)
      FROM tracks t2
      JOIN game_rounds gr ON gr.track_id = t2.id
      WHERE gr.session_id = p_session_id
    )
  ORDER BY RANDOM()
  LIMIT 1;

  -- Attempt 2: Unused track within difficulty, any artist
  IF v_track_id IS NULL THEN
    SELECT t.id INTO v_track_id
    FROM tracks t
    JOIN pack_tracks pt ON pt.track_id = t.id
    WHERE pt.pack_id = v_session.pack_id
      AND t.id NOT IN (
        SELECT gr.track_id
        FROM game_rounds gr
        WHERE gr.session_id = p_session_id
      )
      AND calculate_track_popularity_score(t.id) BETWEEN v_min_popularity AND v_max_popularity
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Attempt 3: Expand difficulty range by ±15
  IF v_track_id IS NULL THEN
    RAISE NOTICE 'No unused tracks in difficulty range, expanding...';

    SELECT t.id INTO v_track_id
    FROM tracks t
    JOIN pack_tracks pt ON pt.track_id = t.id
    WHERE pt.pack_id = v_session.pack_id
      AND t.id NOT IN (
        SELECT gr.track_id
        FROM game_rounds gr
        WHERE gr.session_id = p_session_id
      )
      AND calculate_track_popularity_score(t.id) BETWEEN
        GREATEST(0, v_min_popularity - 15) AND
        LEAST(100, v_max_popularity + 15)
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Attempt 4: Any unused track (ignore difficulty)
  IF v_track_id IS NULL THEN
    RAISE WARNING 'No tracks in expanded difficulty range, selecting any unused track';

    SELECT t.id INTO v_track_id
    FROM tracks t
    JOIN pack_tracks pt ON pt.track_id = t.id
    WHERE pt.pack_id = v_session.pack_id
      AND t.id NOT IN (
        SELECT gr.track_id
        FROM game_rounds gr
        WHERE gr.session_id = p_session_id
      )
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'No more unused tracks available';
  END IF;

  -- Create new round
  INSERT INTO game_rounds (session_id, round_number, track_id)
  VALUES (p_session_id, v_next_round, v_track_id);

  -- Update session
  UPDATE game_sessions
  SET current_round = v_next_round, state = 'playing', round_start_time = NOW()
  WHERE id = p_session_id;

  RETURN QUERY SELECT p_session_id, 'playing'::TEXT, v_next_round, v_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION start_game(UUID) IS 'Starts game with difficulty-based track filtering. Progressive fallback: strict range → expanded ±15 → any track.';
COMMENT ON FUNCTION advance_round(UUID) IS 'Advances round with difficulty filtering and artist deduplication. Progressive fallback ensures game continuity.';
