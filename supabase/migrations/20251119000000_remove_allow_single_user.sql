-- Remove allow_single_user column (redundant with allow_host_to_play)
-- Min players logic: if allow_host_to_play is true, min = 0, else min = 2

ALTER TABLE game_sessions
DROP COLUMN IF EXISTS allow_single_user;
