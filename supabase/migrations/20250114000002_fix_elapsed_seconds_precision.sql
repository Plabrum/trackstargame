-- Fix elapsed_seconds precision to allow larger values
-- Change from DECIMAL(5,2) to DECIMAL(8,2) to support up to 999999.99 seconds
-- This allows for songs up to ~277 hours (way more than needed)
ALTER TABLE game_rounds
ALTER COLUMN elapsed_seconds TYPE DECIMAL(8,2);

-- Fix timezone issues with round_start_time
-- Change from TIMESTAMP to TIMESTAMPTZ to preserve timezone information
ALTER TABLE game_sessions
ALTER COLUMN round_start_time TYPE TIMESTAMPTZ;
