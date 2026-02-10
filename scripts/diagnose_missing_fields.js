const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("🔍 Diagnosing missing fields in Adar stories...\n");
    
    // First check columns
    const { data: sample, error: sampleErr } = await supabase
        .from('stories')
        .select('*')
        .limit(1);
    
    if (sampleErr) {
        console.error("❌ Error:", sampleErr.message);
        return;
    }
    
    console.log("📋 Available columns:", Object.keys(sample[0]).join(', '));
    console.log();
    
    // Check the reported ranges
    const ranges = [
        { label: "Page 12: Ad1040-Ad1163", start: 1040, end: 1163 },
        { label: "Page 13: Ad1164-Ad1288", start: 1164, end: 1288 },
        { label: "Page 14: Ad1289-Ad1409", start: 1289, end: 1409 },
        { label: "Page 15 (approx)", start: 1410, end: 1527 },
        { label: "Page 16: Ad1528-1638", start: 1528, end: 1638 },
        { label: "Page 17 (approx)", start: 1639, end: 1736 },
        { label: "Page 18: Ad1737-1874", start: 1737, end: 1874 },
        { label: "Page 19: Ad1875-1992", start: 1875, end: 1992 },
        { label: "Page 20: Ad1993-2077", start: 1993, end: 2077 },
        { label: "Page 21: Ad2079-2159", start: 2079, end: 2159 },
        { label: "Page 22: Ad2160-2166", start: 2160, end: 2166 },
    ];
    
    for (const range of ranges) {
        // Generate IDs in the range
        const ids = [];
        for (let i = range.start; i <= range.end; i++) {
            ids.push(`Ad${i.toString().padStart(4, '0')}`);
        }
        
        const { data, error } = await supabase
            .from('stories')
            .select('story_id, rabbi_he, rabbi_en, title_en, title_he')
            .in('story_id', ids);
        
        if (error) {
            console.error(`❌ Error querying ${range.label}:`, error.message);
            continue;
        }
        
        const total = data.length;
        const missingRabbiHe = data.filter(s => !s.rabbi_he).length;
        const missingRabbiEn = data.filter(s => !s.rabbi_en).length;
        const missingTitleEn = data.filter(s => !s.title_en).length;
        const missingTitleHe = data.filter(s => !s.title_he).length;
        
        console.log(`📄 ${range.label}`);
        console.log(`   Total found: ${total}/${ids.length}`);
        console.log(`   Missing rabbi_he: ${missingRabbiHe}/${total}`);
        console.log(`   Missing rabbi_en: ${missingRabbiEn}/${total}`);
        console.log(`   Missing title_en: ${missingTitleEn}/${total}`);
        console.log(`   Missing title_he: ${missingTitleHe}/${total}`);
        
        // Show a few examples
        if (missingRabbiHe > 0) {
            const examples = data.filter(s => !s.rabbi_he).slice(0, 3);
            console.log(`   Examples missing rabbi_he: ${examples.map(e => e.story_id).join(', ')}`);
        }
        console.log();
    }
    
    // Check Peninei stories
    console.log("--- PENINEI STORIES ---\n");
    const penineiIds = [];
    for (let p = 346; p <= 350; p++) {
        for (let i = 0; i < 200; i++) {
            // Try various ID formats
            penineiIds.push(`Xx${String(p).padStart(4, '0')}`);
            penineiIds.push(`Pe${String(p * 100 + i).padStart(4, '0')}`);
        }
    }
    
    // Just search for all peninei-related stories
    const { data: peninei, error: penineiErr } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, rabbi_en, title_en, title_he')
        .or('story_id.ilike.%Xx%,story_id.ilike.%Pe%')
        .limit(200);
    
    if (penineiErr) {
        console.error("❌ Peninei error:", penineiErr.message);
    } else {
        console.log(`Found ${peninei.length} Peninei stories`);
        const missingRabbiHe = peninei.filter(s => !s.rabbi_he).length;
        console.log(`Missing rabbi_he: ${missingRabbiHe}/${peninei.length}`);
        if (missingRabbiHe > 0) {
            const examples = peninei.filter(s => !s.rabbi_he).slice(0, 10);
            console.log("Examples:", examples.map(e => `${e.story_id} (rabbi_en: ${e.rabbi_en || 'null'})`).join('\n         '));
        }
    }
    
    // Summary stats for ALL Adar stories
    console.log("\n--- ALL ADAR STORIES SUMMARY ---\n");
    const { data: allAdar, error: allErr } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, rabbi_en, title_en, title_he, date_en')
        .like('story_id', 'Ad%')
        .order('story_id');
    
    if (!allErr && allAdar) {
        console.log(`Total Adar stories: ${allAdar.length}`);
        console.log(`Missing rabbi_he: ${allAdar.filter(s => !s.rabbi_he).length}`);
        console.log(`Missing rabbi_en: ${allAdar.filter(s => !s.rabbi_en).length}`);
        console.log(`Missing title_en: ${allAdar.filter(s => !s.title_en).length}`);
        console.log(`Missing title_he: ${allAdar.filter(s => !s.title_he).length}`);
        
        // Find first and last story with missing rabbi_he
        const firstMissing = allAdar.find(s => !s.rabbi_he);
        const lastMissing = [...allAdar].reverse().find(s => !s.rabbi_he);
        if (firstMissing) console.log(`\nFirst missing rabbi_he: ${firstMissing.story_id}`);
        if (lastMissing) console.log(`Last missing rabbi_he: ${lastMissing.story_id}`);
        
        // Detect contiguous ranges of missing rabbi_he
        console.log("\n📊 Contiguous ranges with missing rabbi_he:");
        let rangeStart = null;
        let prevId = null;
        const missingIds = allAdar.filter(s => !s.rabbi_he).map(s => s.story_id);
        
        for (let i = 0; i < missingIds.length; i++) {
            const num = parseInt(missingIds[i].replace('Ad', ''));
            const nextNum = i < missingIds.length - 1 ? parseInt(missingIds[i+1].replace('Ad', '')) : -1;
            
            if (!rangeStart) rangeStart = missingIds[i];
            
            if (nextNum !== num + 1) {
                console.log(`   ${rangeStart} - ${missingIds[i]}`);
                rangeStart = null;
            }
        }
    }
}

main().catch(console.error);
