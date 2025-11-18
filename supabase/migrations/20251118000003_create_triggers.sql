-- Auto-calculate elapsed_seconds when buzzer is set
CREATE OR REPLACE FUNCTION auto_calculate_elapsed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buzzer_player_id IS NOT NULL AND OLD.buzzer_player_id IS NULL THEN
    NEW.elapsed_seconds := EXTRACT(EPOCH FROM (
      NOW() - (SELECT round_start_time FROM game_sessions WHERE id = NEW.session_id)
    ));
    NEW.buzz_time := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_buzz_time
  BEFORE UPDATE ON game_rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_elapsed();

COMMENT ON FUNCTION auto_calculate_elapsed IS
  'Automatically calculates elapsed time when a player buzzes in';
