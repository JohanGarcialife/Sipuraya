#!/usr/bin/env node
/**
 * STEP 2: Upload to Supabase (VPN OFF)
 * 
 * Reads ready_with_embeddings.json and uploads to Supabase.
 * Uses upsert mode to update existing stories or create new ones.
 * 
 * Usage:
 *   1. Turn VPN OFF
 *   2. node upload_to_supabase_only.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const INPUT_FILE = path.join(__dirname, 'ready_with_embeddings.json');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        console.error('Run "node generate_embeddings_only.js" first.');
        return;
    }

    const stories = JSON.parse(fs.readFileSync(INPUT_FILE));
    console.log(`🚀 Uploading ${stories.length} stories to Supabase (VPN OFF)...`);
    
    const BATCH_SIZE = 50; // Smaller batches for safety
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < stories.length; i += BATCH_SIZE) {
        const batch = stories.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(stories.length / BATCH_SIZE);
        
        process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} stories)...`);
        
        const { data, error } = await supabase
            .from('stories')
            .upsert(batch, { onConflict: 'story_id' });
        
        if (error) {
            console.error(`\n❌ Error: ${error.message}`);
            errorCount += batch.length;
        } else {
            process.stdout.write(` ✅\n`);
            successCount += batch.length;
        }
    }
    
    console.log(`\n✨ Upload complete!`);
    console.log(`   Success: ${successCount} stories`);
    if (errorCount > 0) {
        console.log(`   Errors: ${errorCount} stories`);
    }
}

main();
