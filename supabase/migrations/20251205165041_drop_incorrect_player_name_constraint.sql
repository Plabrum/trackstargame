-- Drop incorrect global unique constraint on player name
-- Player names should only be unique per session, not globally
-- The correct constraint (players_session_id_name_key) already exists

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_name_key;
