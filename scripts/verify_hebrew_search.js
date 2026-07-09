const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('🔍 Testing Hebrew search ignoring Nikud (diacritics)...');
  
  // Search for the plain Hebrew term "תפילין"
  const searchTerm = 'תפילין';
  
  const { data, error } = await supabase
    .from('stories')
    .select('story_id, title_he, body_he, body_he_clean')
    .or(`body_he_clean.ilike.%${searchTerm}%`);

  if (error) {
    console.error('❌ Error executing query:', error.message);
    console.log('💡 Note: If you get a "column does not exist" error, make sure you have executed the migration script "scripts/fix_hebrew_search.sql" in your Supabase SQL Editor first!');
    return;
  }

  console.log(`\n🎉 Success! Found ${data.length} matches in the clean Hebrew body for "${searchTerm}":`);
  data.forEach((story, idx) => {
    console.log(`\n[${idx + 1}] Story ID: ${story.story_id}`);
    console.log(`    Title (HE): ${story.title_he}`);
    console.log(`    Clean Body Snippet: ${story.body_he_clean ? story.body_he_clean.substring(0, 100).trim() + '...' : 'null'}`);
  });
  
  console.log('\n✅ Verification check complete!');
}

verify();
