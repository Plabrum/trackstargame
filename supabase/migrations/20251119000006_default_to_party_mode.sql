-- Set default game mode to party (allow_host_to_play = false, enable_text_input_mode = false)
-- This makes new games start in party mode with text input disabled by default

ALTER TABLE game_sessions
ALTER COLUMN allow_host_to_play SET DEFAULT false;

ALTER TABLE game_sessions
ALTER COLUMN enable_text_input_mode SET DEFAULT false;
