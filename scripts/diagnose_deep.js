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
    console.log("🔍 Deep diagnosis: stories beyond Ad1000 & Peninei\n");
    
    // 1. Check total count of all Ad stories 
    const { count: totalAd } = await supabase
        .from('stories')
        .select('story_id', { count: 'exact', head: true })
        .like('story_id', 'Ad%');
    
    console.log(`Total Ad stories in DB: ${totalAd}`);
    
    // 2. Check total stories in DB
    const { count: totalAll } = await supabase
        .from('stories')
        .select('story_id', { count: 'exact', head: true });
    
    console.log(`Total stories in DB: ${totalAll}`);
    
    // 3. Check stories above Ad1000
    const { data: above1000, error } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, rabbi_en, title_en, title_he, date_en')
        .like('story_id', 'Ad%')
        .order('story_id')
        .range(999, 2200);
    
    if (error) {
        console.error("Error:", error.message);
        return;
    }
    
    console.log(`\nStories from position 1000+: ${above1000.length}`);
    
    if (above1000.length > 0) {
        console.log(`First above 1000: ${above1000[0].story_id}`);
        console.log(`Last in list: ${above1000[above1000.length-1].story_id}`);
        
        // Check for pattern in missing data
        const withRabbiHe = above1000.filter(s => s.rabbi_he);
        const withRabbiEn = above1000.filter(s => s.rabbi_en);
        const withTitleEn = above1000.filter(s => s.title_en);
        
        console.log(`\nWith rabbi_he: ${withRabbiHe.length}/${above1000.length}`);
        console.log(`With rabbi_en: ${withRabbiEn.length}/${above1000.length}`);
        console.log(`With title_en: ${withTitleEn.length}/${above1000.length}`);
        
        // Show first 5 with data and first 5 without
        console.log("\n--- Examples WITH rabbi_he ---");
        withRabbiHe.slice(0, 5).forEach(s => {
            console.log(`  ${s.story_id}: rabbi_he="${s.rabbi_he}", rabbi_en="${s.rabbi_en}", title_en="${s.title_en}"`);
        });
        
        console.log("\n--- Examples WITHOUT rabbi_he ---");
        above1000.filter(s => !s.rabbi_he).slice(0, 10).forEach(s => {
            console.log(`  ${s.story_id}: rabbi_he="${s.rabbi_he}", rabbi_en="${s.rabbi_en}", title_en="${s.title_en}", title_he="${s.title_he}"`);
        });
    }
    
    // 4. Check ALL Peninei/Xx stories
    console.log("\n\n--- ALL PENINEI/Xx STORIES ---\n");
    const { data: peninei } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, rabbi_en, title_en, title_he')
        .like('story_id', 'Xx%')
        .order('story_id');
    
    if (peninei) {
        console.log(`Total Xx stories: ${peninei.length}`);
        peninei.forEach(s => {
            console.log(`  ${s.story_id}: rabbi_he="${s.rabbi_he || 'null'}", rabbi_en="${s.rabbi_en || 'null'}", title_en="${s.title_en || 'null'}"`);
        });
    }
    
    // Also check for any non-Ad, non-Xx prefix stories
    console.log("\n--- NON-AD STORY PREFIXES ---\n");
    const { data: all } = await supabase
        .from('stories')
        .select('story_id')
        .not('story_id', 'like', 'Ad%')
        .order('story_id');
    
    if (all) {
        const prefixes = {};
        all.forEach(s => {
            const prefix = s.story_id.replace(/\d+/g, '');
            prefixes[prefix] = (prefixes[prefix] || 0) + 1;
        });
        console.log("Prefixes found:", prefixes);
        console.log("First 20:", all.slice(0, 20).map(s => s.story_id).join(', '));
    }
}

main().catch(console.error);
