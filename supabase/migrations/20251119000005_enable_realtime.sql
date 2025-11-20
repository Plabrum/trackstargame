-- Enable realtime for game tables
-- This allows subscriptions to postgres_changes events for these tables

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE round_answers;

-- Set replica identity to FULL for better realtime support
-- This ensures all columns are included in the replication stream
ALTER TABLE game_sessions REPLICA IDENTITY FULL;
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE game_rounds REPLICA IDENTITY FULL;
ALTER TABLE round_answers REPLICA IDENTITY FULL;

COMMENT ON PUBLICATION supabase_realtime IS
  'Realtime publication for game state synchronization';
