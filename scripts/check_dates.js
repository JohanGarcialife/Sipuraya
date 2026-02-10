const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    // Get all unique date_en values
    const { data, error } = await supabase
        .from('stories')
        .select('date_en, story_id')
        .not('date_en', 'is', null)
        .limit(50);

    if (error) { console.error(error); return; }

    console.log("=== SAMPLE date_en VALUES ===");
    data.forEach(d => console.log(`  ${d.story_id}: "${d.date_en}"`));

    // Check distinct months by searching common patterns
    const months = ['Nisan', 'Nissan', 'Iyar', 'Sivan', 'Tamuz', 'Tammuz', 'Av', 'Elul', 
                    'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar'];
    
    console.log("\n=== MONTH COUNTS ===");
    for (const month of months) {
        const { count } = await supabase
            .from('stories')
            .select('story_id', { count: 'exact', head: true })
            .ilike('date_en', `%${month}%`);
        if (count > 0) console.log(`  ${month}: ${count} stories`);
    }

    // Also check what prefixes exist
    console.log("\n=== STORY ID PREFIXES ===");
    const { data: allIds } = await supabase
        .from('stories')
        .select('story_id')
        .limit(3000);
    
    const prefixes = {};
    allIds.forEach(s => {
        const prefix = s.story_id.replace(/\d+/g, '');
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    });
    Object.entries(prefixes).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => {
        console.log(`  ${p}: ${c} stories`);
    });
}

main().catch(console.error);
