-- Enable Row Level Security
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- ====================
-- GAME_SESSIONS POLICIES
-- ====================

CREATE POLICY "Anyone can read game sessions"
  ON game_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game sessions"
  ON game_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Can delete lobby or finished games"
  ON game_sessions FOR DELETE
  USING (state IN ('lobby', 'finished'));

-- ====================
-- PLAYERS POLICIES
-- ====================

CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Can join lobby sessions"
  ON players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id AND state = 'lobby'
    )
  );

CREATE POLICY "Players can update self"
  ON players FOR UPDATE
  USING (true);

CREATE POLICY "Players can be removed"
  ON players FOR DELETE
  USING (true);

-- ====================
-- GAME_ROUNDS POLICIES
-- ====================

CREATE POLICY "Anyone can read rounds"
  ON game_rounds FOR SELECT
  USING (true);

CREATE POLICY "Only functions create rounds"
  ON game_rounds FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Can buzz in playing state"
  ON game_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id AND state = 'playing'
    )
  );

CREATE POLICY "Rounds cannot be deleted"
  ON game_rounds FOR DELETE
  USING (false);

-- ====================
-- ROUND_ANSWERS POLICIES
-- ====================

CREATE POLICY "Anyone can read answers"
  ON round_answers FOR SELECT
  USING (true);

CREATE POLICY "Players can submit answers"
  ON round_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Answers can be updated"
  ON round_answers FOR UPDATE
  USING (true);

-- ====================
-- PACKS/TRACKS POLICIES
-- ====================

CREATE POLICY "Anyone can read packs"
  ON packs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read tracks"
  ON tracks FOR SELECT
  USING (true);

COMMENT ON POLICY "Anyone can read game sessions" ON game_sessions IS
  'Public read access for game discovery and join flow';
