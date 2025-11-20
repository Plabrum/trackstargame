-- Trigger to automatically update game session state when someone buzzes
CREATE OR REPLACE FUNCTION update_session_state_on_buzz()
RETURNS TRIGGER AS $$
BEGIN
  -- When a player buzzes in (buzzer_player_id changes from NULL to non-NULL)
  IF NEW.buzzer_player_id IS NOT NULL AND OLD.buzzer_player_id IS NULL THEN
    -- Update the game session state to 'buzzed'
    UPDATE game_sessions
    SET state = 'buzzed'
    WHERE id = NEW.session_id
    AND state = 'playing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_state_on_buzz
  AFTER UPDATE ON game_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_session_state_on_buzz();

COMMENT ON FUNCTION update_session_state_on_buzz IS
  'Automatically updates game session state to buzzed when a player buzzes in';
