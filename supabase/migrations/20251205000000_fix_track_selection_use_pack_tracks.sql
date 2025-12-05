-- Fix track selection to use pack_tracks junction table
-- This migration fixes a bug where start_game and advance_round functions
-- reference tracks.pack_id, which no longer exists after artist normalization

-- Update start_game function to use pack_tracks junction table
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
BEGIN
  -- Get session
  SELECT * INTO v_session FROM game_sessions WHERE game_sessions.id = p_session_id;

  IF v_session.state != 'lobby' THEN
    RAISE EXCEPTION 'Game can only be started from lobby state';
  END IF;

  -- Count players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE session_id = p_session_id;

  -- If host can play and no host player exists yet, create one
  IF v_session.allow_host_to_play THEN
    -- Check if a host player already exists
    SELECT id INTO v_host_player_id FROM players
    WHERE session_id = p_session_id AND is_host = true
    LIMIT 1;

    -- If no host player exists, create one
    IF v_host_player_id IS NULL THEN
      INSERT INTO players (session_id, name, is_host, score)
      VALUES (p_session_id, v_session.host_name, true, 0)
      RETURNING players.id INTO v_host_player_id;

      v_player_count := v_player_count + 1;
    END IF;
  END IF;

  -- Validate minimum player count (after potentially adding host player)
  IF v_player_count < 1 THEN
    RAISE EXCEPTION 'Need at least 1 player to start';
  END IF;

  -- Get random track using pack_tracks junction table
  SELECT t.id INTO v_track_id
  FROM tracks t
  JOIN pack_tracks pt ON pt.track_id = t.id
  WHERE pt.pack_id = v_session.pack_id
  ORDER BY RANDOM()
  LIMIT 1;

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

-- Update advance_round function to use pack_tracks and get_track_artists
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
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;

  IF v_session.state != 'reveal' THEN
    RAISE EXCEPTION 'Can only advance from reveal state';
  END IF;

  v_next_round := v_session.current_round + 1;

  -- Check if game is over
  IF v_next_round > v_session.total_rounds THEN
    UPDATE game_sessions SET state = 'finished' WHERE id = p_session_id;
    RETURN QUERY SELECT p_session_id, 'finished'::TEXT, v_session.current_round, NULL::UUID;
    RETURN;
  END IF;

  -- Try to get a track from an artist not yet used in this game
  -- This query prioritizes artists that haven't appeared yet
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
    -- Prefer artists not yet used (using get_track_artists helper)
    AND get_track_artists(t.id) NOT IN (
      SELECT DISTINCT get_track_artists(t2.id)
      FROM tracks t2
      JOIN game_rounds gr ON gr.track_id = t2.id
      WHERE gr.session_id = p_session_id
    )
  ORDER BY RANDOM()
  LIMIT 1;

  -- If no track found from unused artists, fall back to any unused track
  -- (this happens when all artists have been used at least once)
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

COMMENT ON FUNCTION start_game(UUID) IS 'Fixed to use pack_tracks junction table instead of non-existent tracks.pack_id';
COMMENT ON FUNCTION advance_round(UUID) IS 'Fixed to use pack_tracks junction table and get_track_artists() for artist deduplication';
