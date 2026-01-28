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
    console.log("🔍 Checking actual table schema...\n");
    
    // Get one story to see the actual columns
    const { data, error } = await supabase
        .from('stories')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("❌ Error:", error.message);
        return;
    }
    
    if (data && data.length > 0) {
        console.log("Available columns in stories table:");
        console.log(Object.keys(data[0]));
        
        console.log("\nHas 'id' column?", 'id' in data[0]);
        console.log("Has 'story_id' column?", 'story_id' in data[0]);
    }
}

main();
