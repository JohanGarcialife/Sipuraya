-- Complete table creation script for Sipuraya stories
-- Execute this in Supabase SQL Editor

-- Drop table if exists (optional, only if you need to start fresh)
-- DROP TABLE IF EXISTS stories;

-- Create stories table with all fields including tags
CREATE TABLE IF NOT EXISTS stories (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  hebrew_month TEXT NOT NULL,
  hebrew_day INTEGER NOT NULL,
  hebrew_month_index INTEGER,
  title_en TEXT,
  title_he TEXT,
  body_en TEXT,
  body_he TEXT,
  embedding vector(1536),
  is_published BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',  -- NEW: Metadata tags array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_external_id ON stories(external_id);
CREATE INDEX IF NOT EXISTS idx_stories_hebrew_month ON stories(hebrew_month);
CREATE INDEX IF NOT EXISTS idx_stories_is_published ON stories(is_published);
CREATE INDEX IF NOT EXISTS idx_stories_tags ON stories USING GIN(tags);

-- Create index for vector similarity search (if using pgvector)
CREATE INDEX IF NOT EXISTS idx_stories_embedding ON stories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify table creation
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stories'
ORDER BY ordinal_position;
