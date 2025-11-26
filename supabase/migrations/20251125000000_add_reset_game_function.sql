-- Add reset_game RPC function for play again functionality
CREATE OR REPLACE FUNCTION reset_game(
  p_session_id UUID,
  p_new_pack_id UUID
)
RETURNS TABLE(
  session_id UUID,
  new_state TEXT,
  first_round INT,
  first_track_id UUID
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_track_id UUID;
BEGIN
  -- Validate session exists and is in finished state
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.state != 'finished' THEN
    RAISE EXCEPTION 'Can only reset from finished state, current state: %', v_session.state;
  END IF;

  -- Validate new pack exists and has tracks
  IF NOT EXISTS (SELECT 1 FROM tracks WHERE pack_id = p_new_pack_id LIMIT 1) THEN
    RAISE EXCEPTION 'Pack has no tracks available';
  END IF;

  -- Delete all rounds (cascade deletes round_answers via FK)
  DELETE FROM game_rounds WHERE session_id = p_session_id;

  -- Reset all player scores to 0 (keeps players in session)
  UPDATE players SET score = 0 WHERE session_id = p_session_id;

  -- Select random track from new pack
  SELECT id INTO v_track_id
  FROM tracks
  WHERE pack_id = p_new_pack_id
  ORDER BY RANDOM()
  LIMIT 1;

  -- Create first round with new track
  INSERT INTO game_rounds (session_id, round_number, track_id)
  VALUES (p_session_id, 1, v_track_id);

  -- Update session to playing state with new pack
  UPDATE game_sessions
  SET
    pack_id = p_new_pack_id,
    state = 'playing',
    current_round = 1,
    round_start_time = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Return result
  RETURN QUERY
  SELECT p_session_id AS session_id, 'playing'::TEXT AS new_state, 1 AS first_round, v_track_id AS first_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
