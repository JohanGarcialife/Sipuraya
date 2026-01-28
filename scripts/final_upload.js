const path = require('path');
// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env. SUPABASE_SERVICE_ROLE_KEY;
const INPUT_FILE = path.join(__dirname, 'ready_to_upload.json');

// Validación básica
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ No data file found. Run 'node bulk.js' first.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE));
    console.log(`🚀 Uploading ${data.length} stories to Supabase (VPN OFF)...`);
    
    const BATCH_SIZE = 100;
    let batch = [];
    
    for (let i = 0; i < data.length; i++) {
        batch.push(data[i]);
        
        if (batch.length >= BATCH_SIZE || i === data.length - 1) {
            const { error } = await supabase.from('stories').upsert(batch, { onConflict: 'story_id' });
            if (error) console.error("❌ DB Error:", error.message);
            else process.stdout.write('✅');
            batch = [];
        }
    }
    console.log("\n✨ Database fully populated!");
}
main();