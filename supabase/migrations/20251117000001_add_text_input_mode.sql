-- Add text input mode setting to game sessions
ALTER TABLE game_sessions
ADD COLUMN enable_text_input_mode BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN game_sessions.enable_text_input_mode IS 'When enabled, players submit answers via text input instead of buzzing';
