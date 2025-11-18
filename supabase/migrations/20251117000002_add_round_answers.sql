-- Add round_answers table to track submitted answers in text input mode
CREATE TABLE round_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  submitted_answer TEXT NOT NULL,
  auto_validated BOOLEAN,
  is_correct BOOLEAN,
  points_awarded INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_id, player_id) -- Each player can only submit one answer per round
);

CREATE INDEX idx_round_answers_round_id ON round_answers(round_id);
CREATE INDEX idx_round_answers_player_id ON round_answers(player_id);

COMMENT ON TABLE round_answers IS 'Stores submitted answers for each player in text input mode';
COMMENT ON COLUMN round_answers.auto_validated IS 'Result of automatic fuzzy matching validation';
COMMENT ON COLUMN round_answers.is_correct IS 'Final judgment (either auto_validated or host override)';
