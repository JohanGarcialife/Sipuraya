-- Migration: Add tags column to stories table
-- Execute this in Supabase SQL Editor

-- Step 1: Add tags column as text array
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Step 2: Add comment for documentation
COMMENT ON COLUMN stories.tags IS 'Array of metadata tags extracted from ### markers in source documents';

-- Step 3: Add GIN index for efficient tag searching (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_stories_tags ON stories USING GIN(tags);

-- Verification query
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stories' AND column_name = 'tags';
