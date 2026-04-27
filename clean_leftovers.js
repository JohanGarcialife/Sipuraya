require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function cleanLeftovers() {
  console.log("Deleting stories with prefix 'Ly'...");
  const { count, error } = await supabase
    .from('stories')
    .delete({ count: 'exact' })
    .ilike('story_id', 'Ly%');
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log(`Successfully deleted ${count} leftover stories.`);
  }
}

cleanLeftovers();
