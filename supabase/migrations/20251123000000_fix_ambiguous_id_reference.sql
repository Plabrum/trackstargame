-- Fix ambiguous column reference in start_game function
-- The issue is that the RETURNS TABLE defines 'id' and we're also selecting 'id' from players table
-- Need to explicitly qualify the column reference

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
    -- Check if a host player already exists (explicitly qualify the id column)
    SELECT players.id INTO v_host_player_id FROM players
    WHERE players.session_id = p_session_id AND players.is_host = true
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

  -- Get random track (no artist filtering needed for first round)
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
