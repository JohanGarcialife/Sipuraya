const path = require('path');
// Load env vars
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const INPUT_FILE = path.join(__dirname, 'ready_to_upload.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("🔍 Identifying missing stories...\n");
    
    // Load local JSON
    const localData = JSON.parse(fs.readFileSync(INPUT_FILE));
    console.log(`📁 Local JSON: ${localData.length} stories`);
    
    // Get all story_ids from Supabase
    const { data: dbStories, error } = await supabase
        .from('stories')
        .select('story_id');
    
    if (error) {
        console.error("❌ Database error:", error.message);
        process.exit(1);
    }
    
    console.log(`💾 Database: ${dbStories.length} stories\n`);
    
    // Create set of existing IDs
    const existingIds = new Set(dbStories.map(s => s.story_id));
    
    // Find missing stories
    const missingStories = localData.filter(story => !existingIds.has(story.story_id));
    
    console.log(`\n❌ Missing: ${missingStories.length} stories\n`);
    
    if (missingStories.length === 0) {
        console.log("✅ All stories are already in database!");
        return;
    }
    
    // Show sample of missing IDs
    console.log("Sample of missing story IDs:");
    missingStories.slice(0, 10).forEach(s => console.log(`  - ${s.story_id}`));
    if (missingStories.length > 10) {
        console.log(`  ... and ${missingStories.length - 10} more\n`);
    }
    
    // Upload missing stories
    console.log(`\n🚀 Uploading ${missingStories.length} missing stories...`);
    
    const BATCH_SIZE = 100;
    let uploaded = 0;
    
    for (let i = 0; i < missingStories.length; i += BATCH_SIZE) {
        const batch = missingStories.slice(i, i + BATCH_SIZE);
        
        const { error: uploadError } = await supabase
            .from('stories')
            .insert(batch);
        
        if (uploadError) {
            console.error(`\n❌ Error uploading batch ${Math.floor(i/BATCH_SIZE) + 1}:`, uploadError.message);
            console.error("Failed IDs:", batch.map(s => s.story_id).slice(0, 5));
        } else {
            uploaded += batch.length;
            process.stdout.write('✅');
        }
    }
    
    console.log(`\n\n✨ Successfully uploaded ${uploaded} stories!`);
    console.log(`📊 Database should now have: ${dbStories.length + uploaded} stories`);
}

main();
