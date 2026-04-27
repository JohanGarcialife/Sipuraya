require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeftovers() {
  const { data, error } = await supabase
    .from('stories')
    .select('story_id')
    .ilike('story_id', 'Ly%');
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${data.length} stories with 'Ly' prefix.`);
    if (data.length > 0) {
      console.log('Sample:', data.slice(0, 5));
    }
  }
}

checkLeftovers();
