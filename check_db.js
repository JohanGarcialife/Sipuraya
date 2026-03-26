const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
  const { data, error } = await supabase
    .from('stories')
    .select('story_id, rabbi_en, rabbi_he, title_en, title_he, date_en, date_he, body_he')
    .ilike('story_id', 'Ni0%')
    .order('story_id', { ascending: true })
    .limit(3);

  if (error) {
    console.error(error);
  } else {
    console.dir(data, { depth: null });
    console.log(`\n\nPreview body_he for ${data[0].story_id}: ${data[0].body_he?.substring(0,250)}`);
  }
}

checkDb();
