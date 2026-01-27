const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('🗑️  Database Cleanup Script');
  console.log('=' .repeat(50));
  console.log('⚠️  WARNING: This will DELETE ALL stories from the database!');
  console.log('');
  
  // First, get the count of stories
  const { count, error: countError } = await supabase
    .from('stories')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting stories:', countError.message);
    process.exit(1);
  }
  
  console.log(`📊 Current stories in database: ${count}`);
  console.log('');
  console.log('This script will DELETE all these stories.');
  console.log('Press Ctrl+C now if you want to cancel.');
  console.log('');
  console.log('Waiting 5 seconds before proceeding...');
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🔄 Deleting all stories...');
  
  // Delete all stories
  const { error } = await supabase
    .from('stories')
    .delete()
    .neq('id', 0); // Delete everything (using neq with impossible condition)
  
  if (error) {
    console.error('❌ Error deleting stories:', error.message);
    process.exit(1);
  }
  
  // Verify deletion
  const { count: newCount } = await supabase
    .from('stories')
    .select('*', { count: 'exact', head: true });
  
  console.log('');
  console.log('✅ Database cleaned successfully!');
  console.log(`📊 Stories remaining: ${newCount}`);
  console.log('');
  console.log('✨ Ready for fresh data ingestion!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Turn VPN ON 🟢');
  console.log('2. Run: node batch_process.js');
  console.log('3. Turn VPN OFF 🔴');
  console.log('4. Run: node final_upload.js');
}

cleanDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
