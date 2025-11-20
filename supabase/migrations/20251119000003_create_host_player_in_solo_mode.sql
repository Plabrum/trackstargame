-- Create host player when starting game in solo mode

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

  -- If host can play solo and no players exist, create a host player
  IF v_player_count = 0 AND v_session.allow_host_to_play THEN
    INSERT INTO players (session_id, name, is_host, score)
    VALUES (p_session_id, v_session.host_name, true, 0)
    RETURNING players.id INTO v_host_player_id;

    v_player_count := 1;
  END IF;

  -- If host can't play solo, need at least 2 players
  IF v_player_count < 2 AND NOT v_session.allow_host_to_play THEN
    RAISE EXCEPTION 'Need at least 2 players to start';
  END IF;

  -- Get random track
  SELECT tracks.id INTO v_track_id
  FROM tracks
  WHERE pack_id = v_session.pack_id
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
