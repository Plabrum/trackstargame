-- Create RPC function to atomically increment player score
CREATE OR REPLACE FUNCTION increment_player_score(player_id UUID, points INT)
RETURNS VOID AS $$
BEGIN
  UPDATE players
  SET score = COALESCE(score, 0) + points
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql;
