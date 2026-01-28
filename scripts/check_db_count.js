const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("📊 Checking actual database count...\n");
    
    // Method 1: Count via query
    const { count, error } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error("❌ Error:", error.message);
        return;
    }
    
    console.log(`💾 Database count (exact): ${count} stories`);
    
    // Method 2: Check range of story_ids
    const { data: firstStory } = await supabase
        .from('stories')
        .select('story_id')
        .order('story_id', { ascending: true })
        .limit(1);
    
    const { data: lastStory } = await supabase
        .from('stories')
        .select('story_id')
        .order('story_id', { ascending: false })
        .limit(1);
    
    if (firstStory && lastStory) {
        console.log(`📌 ID Range: ${firstStory[0].story_id} → ${lastStory[0].story_id}\n`);
    }
    
    // Sample some IDs
    const { data: sample } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, date_he')
        .limit(5);
    
    console.log("Sample stories:");
    sample.forEach(s => console.log(`  ${s.story_id}: ${s.rabbi_he || '(no rabbi)'} - ${s.date_he}`));
}

main();
