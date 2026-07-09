-- SQL Migration: Ignore Hebrew Nikud in searches
-- Run this query in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard)

-- 1. Add normal columns to store clean Hebrew text (without Nikud/diacritics)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS body_he_clean TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS title_he_clean TEXT;

-- 2. Create utility function to strip Hebrew Nikud (Unicode range U+0591 to U+05C7)
CREATE OR REPLACE FUNCTION strip_nikud(text_val TEXT)
RETURNS TEXT AS $$
BEGIN
  IF text_val IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(text_val, '[\u0591-\u05C7]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create the trigger function that automatically updates the clean columns
CREATE OR REPLACE FUNCTION trigger_stories_clean_hebrew()
RETURNS TRIGGER AS $$
BEGIN
  NEW.body_he_clean := strip_nikud(NEW.body_he);
  NEW.title_he_clean := strip_nikud(NEW.title_he);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to run before insert or update on stories
DROP TRIGGER IF EXISTS trg_stories_clean_hebrew ON stories;
CREATE TRIGGER trg_stories_clean_hebrew
BEFORE INSERT OR UPDATE ON stories
FOR EACH ROW
EXECUTE FUNCTION trigger_stories_clean_hebrew();

-- 5. Redefine text_search_stories RPC function for public vector fallback search
-- Must DROP first because return type is changing
DROP FUNCTION IF EXISTS text_search_stories(text, integer);
CREATE OR REPLACE FUNCTION text_search_stories(search_term TEXT, match_limit INT)
RETURNS SETOF stories AS $$
DECLARE
  clean_term TEXT;
BEGIN
  clean_term := strip_nikud(search_term);
  
  RETURN QUERY
  SELECT *
  FROM stories
  WHERE 
    title_en % search_term OR
    body_en % search_term OR
    title_he_clean % clean_term OR
    body_he_clean % clean_term OR
    story_id ILIKE '%' || search_term || '%'
  ORDER BY 
    similarity(title_en, search_term) DESC,
    similarity(title_he_clean, clean_term) DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. Populate clean columns for all existing stories directly
UPDATE stories SET
  body_he_clean = strip_nikud(body_he),
  title_he_clean = strip_nikud(title_he);

-- Verification Query: check if columns are populated
SELECT story_id, title_he, title_he_clean, SUBSTRING(body_he, 1, 50) as body_raw, SUBSTRING(body_he_clean, 1, 50) as body_clean
FROM stories 
WHERE title_he IS NOT NULL 
LIMIT 5;
