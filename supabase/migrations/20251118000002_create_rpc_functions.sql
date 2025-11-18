-- ====================
-- RPC FUNCTION: start_game
-- ====================

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
BEGIN
  -- Get session
  SELECT * INTO v_session FROM game_sessions WHERE game_sessions.id = p_session_id;

  IF v_session.state != 'lobby' THEN
    RAISE EXCEPTION 'Game can only be started from lobby state';
  END IF;

  -- Count players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE session_id = p_session_id;

  IF v_player_count < 2 AND NOT v_session.allow_single_user THEN
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

-- ====================
-- RPC FUNCTION: judge_answer
-- ====================

CREATE OR REPLACE FUNCTION judge_answer(
  p_session_id UUID,
  p_correct BOOLEAN
)
RETURNS TABLE(
  round_id UUID,
  buzzer_player_id UUID,
  correct BOOLEAN,
  points_awarded INT,
  new_player_score INT
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_round game_rounds%ROWTYPE;
  v_points INT;
  v_new_score INT;
BEGIN
  -- Validate state
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF v_session.state != 'buzzed' THEN
    RAISE EXCEPTION 'Can only judge in buzzed state';
  END IF;

  -- Get current round
  SELECT * INTO v_round FROM game_rounds
  WHERE session_id = p_session_id AND round_number = v_session.current_round;

  -- Calculate points
  IF p_correct THEN
    v_points := GREATEST(1, ROUND(30 - v_round.elapsed_seconds));
  ELSE
    v_points := -10;
  END IF;

  -- Update round
  UPDATE game_rounds
  SET correct = p_correct, points_awarded = v_points
  WHERE id = v_round.id;

  -- Update player score
  UPDATE players
  SET score = score + v_points
  WHERE id = v_round.buzzer_player_id
  RETURNING score INTO v_new_score;

  -- Update session state
  UPDATE game_sessions SET state = 'reveal' WHERE id = p_session_id;

  -- Return result
  RETURN QUERY
  SELECT v_round.id, v_round.buzzer_player_id, p_correct, v_points, v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- RPC FUNCTION: advance_round
-- ====================

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

  -- Get random unused track
  SELECT tracks.id INTO v_track_id
  FROM tracks
  WHERE pack_id = v_session.pack_id
    AND tracks.id NOT IN (SELECT game_rounds.track_id FROM game_rounds WHERE game_rounds.session_id = p_session_id)
  ORDER BY RANDOM()
  LIMIT 1;

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

-- ====================
-- RPC FUNCTION: submit_answer
-- ====================

CREATE OR REPLACE FUNCTION submit_answer(
  p_session_id UUID,
  p_player_id UUID,
  p_answer TEXT,
  p_auto_validated BOOLEAN,
  p_points_awarded INT
)
RETURNS TABLE(
  answer_id UUID,
  all_players_submitted BOOLEAN
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_round game_rounds%ROWTYPE;
  v_answer_id UUID;
  v_total_players INT;
  v_submitted_count INT;
  v_all_submitted BOOLEAN;
BEGIN
  -- Validate session
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF NOT v_session.enable_text_input_mode THEN
    RAISE EXCEPTION 'Text input mode not enabled';
  END IF;
  IF v_session.state != 'playing' THEN
    RAISE EXCEPTION 'Can only submit in playing state';
  END IF;

  -- Get round
  SELECT * INTO v_round FROM game_rounds
  WHERE session_id = p_session_id AND round_number = v_session.current_round;

  -- Check duplicate submission
  IF EXISTS (SELECT 1 FROM round_answers WHERE round_id = v_round.id AND player_id = p_player_id) THEN
    RAISE EXCEPTION 'Already submitted an answer';
  END IF;

  -- Insert answer
  INSERT INTO round_answers (round_id, player_id, submitted_answer, auto_validated, is_correct, points_awarded)
  VALUES (v_round.id, p_player_id, p_answer, p_auto_validated, p_auto_validated, p_points_awarded)
  RETURNING id INTO v_answer_id;

  -- Check if all submitted
  SELECT COUNT(*) INTO v_total_players FROM players WHERE session_id = p_session_id;
  SELECT COUNT(*) INTO v_submitted_count FROM round_answers WHERE round_id = v_round.id;
  v_all_submitted := (v_submitted_count = v_total_players);

  -- Auto-finalize in single player mode
  IF v_session.allow_single_user AND v_all_submitted AND p_auto_validated THEN
    UPDATE players SET score = score + p_points_awarded WHERE id = p_player_id;
    UPDATE game_rounds SET correct = TRUE, points_awarded = p_points_awarded WHERE id = v_round.id;
    UPDATE game_sessions SET state = 'reveal' WHERE id = p_session_id;
  ELSIF v_all_submitted THEN
    UPDATE game_sessions SET state = 'submitted' WHERE id = p_session_id;
  END IF;

  RETURN QUERY SELECT v_answer_id, v_all_submitted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- RPC FUNCTION: finalize_judgments
-- ====================

CREATE OR REPLACE FUNCTION finalize_judgments(
  p_session_id UUID,
  p_overrides JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  leaderboard JSONB
) AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_round game_rounds%ROWTYPE;
  v_answer RECORD;
  v_final_judgment BOOLEAN;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF v_session.state != 'submitted' THEN
    RAISE EXCEPTION 'Can only finalize in submitted state';
  END IF;

  SELECT * INTO v_round FROM game_rounds
  WHERE session_id = p_session_id AND round_number = v_session.current_round;

  -- Process all answers
  FOR v_answer IN SELECT * FROM round_answers WHERE round_id = v_round.id
  LOOP
    -- Check for host override
    IF p_overrides ? v_answer.player_id::TEXT THEN
      v_final_judgment := (p_overrides->>v_answer.player_id::TEXT)::BOOLEAN;
    ELSE
      v_final_judgment := v_answer.auto_validated;
    END IF;

    -- Update answer
    UPDATE round_answers SET is_correct = v_final_judgment WHERE id = v_answer.id;

    -- Award points if correct
    IF v_final_judgment THEN
      UPDATE players SET score = score + v_answer.points_awarded WHERE id = v_answer.player_id;
    END IF;
  END LOOP;

  -- Update session state
  UPDATE game_sessions SET state = 'reveal' WHERE id = p_session_id;

  -- Build leaderboard
  RETURN QUERY
  SELECT
    TRUE,
    JSONB_AGG(
      JSONB_BUILD_OBJECT('playerId', p.id, 'playerName', p.name, 'score', p.score)
      ORDER BY p.score DESC
    )
  FROM players p WHERE p.session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
