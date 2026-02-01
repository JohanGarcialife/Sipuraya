const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Make sure .env.local exists in the project root.');
  console.error('Looking for:', path.resolve(__dirname, '../.env.local'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteNissanStories() {
  console.log('Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}`);
  
  // Delete all stories starting with 'Ni'
  const { count, error } = await supabase
    .from('stories')
    .delete({ count: 'exact' })
    .like('story_id', 'Ni%');

  if (error) {
    console.error('Error deleting stories:', error);
  } else {
    console.log(`✅ Successfully deleted ${count} stories starting with "Ni" (Nissan).`);
  }
}

deleteNissanStories();
