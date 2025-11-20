-- Add tags column to packs table
ALTER TABLE packs ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create GIN index for efficient tag searching
CREATE INDEX idx_packs_tags ON packs USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN packs.tags IS 'Freeform tags for categorization (genre, decade, difficulty, etc.)';
