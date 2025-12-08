-- Fix foreign key constraint pointing to wrong table
-- The constraint was pointing to tracks_old_backup instead of tracks

-- Drop the incorrect foreign key constraint
ALTER TABLE game_rounds
  DROP CONSTRAINT IF EXISTS game_rounds_track_id_fkey;

-- Add the correct foreign key constraint pointing to tracks table
ALTER TABLE game_rounds
  ADD CONSTRAINT game_rounds_track_id_fkey
  FOREIGN KEY (track_id)
  REFERENCES tracks(id);
