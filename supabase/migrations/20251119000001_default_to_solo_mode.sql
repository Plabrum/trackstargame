-- Set default game mode to solo (allow_host_to_play = true, enable_text_input_mode = true)
-- This allows hosts to start games alone by default

ALTER TABLE game_sessions
ALTER COLUMN allow_host_to_play SET DEFAULT true;

ALTER TABLE game_sessions
ALTER COLUMN enable_text_input_mode SET DEFAULT true;
