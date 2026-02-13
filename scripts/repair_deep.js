const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const mammoth = require('mammoth');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

const DATA_DIR = path.join(__dirname, 'data');

async function main() {
    // Get all stories missing rabbi_he
    const { data: missing } = await supabase.from('stories').select('story_id, rabbi_en, rabbi_he')
        .is('rabbi_he', null).limit(200);
    
    console.log(`Total missing rabbi_he: ${missing.length}`);
    
    // Also fix Ad2143 which has the date as rabbi_he
    const { data: wrongRabbi } = await supabase.from('stories').select('story_id, rabbi_he')
        .not('rabbi_he', 'is', null)
        .limit(3000);
    
    // Find stories where rabbi_he looks like a date (starts with gematria + month)
    const hebrewMonths = ['ניסן','אדר','אייר','סיון','תמוז','אב','אלול','תשרי','חשון','כסלו','טבת','שבט'];
    const dateAsRabbi = wrongRabbi.filter(s => {
        if (!s.rabbi_he) return false;
        return hebrewMonths.some(m => s.rabbi_he.includes(m) && s.rabbi_he.length < 20);
    });
    
    console.log(`\nStories with DATE as rabbi_he: ${dateAsRabbi.length}`);
    dateAsRabbi.forEach(d => console.log(`  ${d.story_id}: "${d.rabbi_he}"`));
    
    // Build a map of all stories in Hebrew files for the missing ones
    const missingIds = new Set(missing.map(s => s.story_id));
    dateAsRabbi.forEach(s => missingIds.add(s.story_id));
    
    console.log(`\nSearching for ${missingIds.size} story IDs in Hebrew files...`);
    
    const allFiles = fs.readdirSync(DATA_DIR);
    const hebrewFiles = allFiles.filter(f => 
        f.match(/^Adar \d+ edit\.docx$/i) || f.match(/^peninei \d+\.docx$/i)
    ).sort();
    
    const foundRabbis = new Map();
    
    for (const file of hebrewFiles) {
        const filePath = path.join(DATA_DIR, file);
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        
        // Find each missing story
        for (const id of missingIds) {
            const idRegex = new RegExp(`#סיפור_מספר:\\s*${id}`, 'i');
            const match = idRegex.exec(text);
            if (!match) continue;
            
            // Extract content for this story
            const start = match.index;
            const nextStory = text.indexOf('#סיפור_מספר:', start + 10);
            const end = nextStory > 0 ? nextStory : Math.min(start + 5000, text.length);
            let content = text.substring(start, end);
            
            // Remove ID and NEW STORY
            content = content.replace(/#סיפור_מספר:\s*[A-Za-z]{1,2}\d+/i, '');
            content = content.replace(/###NEW STORY/gi, '');
            
            // Split-based extraction
            const segments = content.split('###').map(s => s.trim()).filter(s => s.length > 0);
            for (const seg of segments) {
                if (/^(KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|NEW STORY)/i.test(seg)) continue;
                if (/^English Translation/i.test(seg) || /^Hebrew Translation/i.test(seg)) continue;
                if (/^(Date|תאריך)/i.test(seg)) continue;
                if (seg.length > 200) continue;
                // Skip date patterns
                const datePattern = /^[א-ת]+['"׳״]?[א-ת]*\s*(ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט)/;
                if (datePattern.test(seg)) continue;
                foundRabbis.set(id, seg);
                break;
            }
            
            if (!foundRabbis.has(id)) {
                console.log(`  ${id} in ${file}: NO rabbi found. Segments: ${segments.slice(0,3).map(s => '"' + s.substring(0,50) + '"').join(', ')}`);
            }
        }
    }
    
    console.log(`\nFound rabbis for ${foundRabbis.size}/${missingIds.size} stories`);
    
    // Update DB
    let updated = 0;
    for (const [id, rabbi] of foundRabbis) {
        const { error } = await supabase.from('stories').update({ rabbi_he: rabbi }).eq('story_id', id);
        if (error) console.error(`  Error ${id}: ${error.message}`);
        else updated++;
    }
    
    console.log(`Updated: ${updated}`);
    
    // Final check
    const { count } = await supabase.from('stories').select('*', { count: 'exact', head: true }).is('rabbi_he', null);
    console.log(`\nStories still missing rabbi_he: ${count}`);
}

main().catch(console.error);
