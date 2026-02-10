/**
 * REPAIR SCRIPT: Fix missing rabbi_he (and rabbi_en/title_en where missing)
 * 
 * Re-parses ALL Hebrew .docx files from scripts/data/ using the FIXED parseHebrewStory logic
 * and updates Supabase records that have null rabbi_he.
 * 
 * Also re-parses English files to fill missing rabbi_en and title_en.
 * 
 * Usage: node repair_rabbi_he.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const fs = require('fs');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_DIR = path.join(__dirname, 'data');

// --- HELPERS (copied from zipper.js) ---
function cleanId(id) {
    if (!id) return null;
    return id.replace(/[^a-zA-Z0-9]/g, '');
}

function splitHebrewStories(text) {
    const stories = [];
    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({ id: match[1], position: match.index });
    }
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].position;
        const end = i < matches.length - 1 ? matches[i + 1].position : text.length;
        stories.push({ id: cleanId(matches[i].id), content: text.substring(start, end) });
    }
    return stories;
}

// FIXED parseHebrewStory - skips KOTERET/BIOGRAPHY tags
function parseHebrewStory(story) {
    let content = story.content;
    let rabbi_name = null;

    // Remove the ID tag
    content = content.replace(/#סיפור_מספר:\s*[A-Za-z]{1,2}\d+/i, '');
    // Remove ###NEW STORY
    content = content.replace(/###NEW STORY/gi, '');

    // FIXED: Use split approach - rabbi names contain " quotes breaking regex matching
    const segments = content.split('###').map(s => s.trim()).filter(s => s.length > 0);
    for (const seg of segments) {
        if (/^(KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|NEW STORY)/i.test(seg)) continue;
        if (/^English Translation/i.test(seg) || /^Hebrew Translation/i.test(seg)) continue;
        if (/^(Date|תאריך)/i.test(seg)) continue;
        if (seg.length > 200) continue;
        const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
        const datePattern = new RegExp(`^[א-ת]+['"׳״]?[א-ת]*\\s*(${hebrewMonths})`);
        if (datePattern.test(seg)) continue;
        rabbi_name = seg;
        break;
    }

    return { id: story.id, rabbi_name };
}

// Extract English rabbi/title from English story block
function parseEnglishBlock(block) {
    const lines = block.replace(/\r\n/g, '\n').split('\n');
    let id = null;
    let title_en = null;
    let rabbi_en = null;
    let body = [];

    const regexTitleEn = /###English Title:|English Title:|Title:/i;
    const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:/i;

    lines.forEach(line => {
        const cl = line.trim();
        if (!cl) return;

        // ID extraction
        const idMatch = cl.match(/\b([A-Za-z]{1,2}\d+)\b/i);
        if (idMatch && !id) {
            id = idMatch[1].replace(/[^a-zA-Z0-9]/g, '');
        }

        if (regexTitleEn.test(cl)) {
            title_en = cl.replace(regexTitleEn, '').replace(/###/g, '').trim();
        }
        if (regexRabbi.test(cl)) {
            rabbi_en = cl.replace(regexRabbi, '').replace(/###/g, '').trim();
        }

        // Body (for extracting rabbi from body text)
        if (!cl.startsWith('###') && !/^(NEW STORY|Story ID)/i.test(cl)) {
            body.push(cl);
        }
    });

    // Fallback: extract rabbi from body
    if (!rabbi_en && body.length > 0) {
        const bodyText = body.join('\n');
        const firstPart = bodyText.substring(0, 500);

        const p1 = /^Rabbi\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m;
        const m1 = firstPart.match(p1);
        if (m1) rabbi_en = `Rabbi ${m1[1]}`;

        if (!rabbi_en) {
            const p2 = /(?:the\s+)?(?:holy\s+)?Rabbi\s+([A-Z][a-z]+(?:\s+(?:ben\s+)?[A-Z][a-z]+)*)/i;
            const m2 = firstPart.match(p2);
            if (m2) rabbi_en = `Rabbi ${m2[1]}`;
        }
    }

    return { id, title_en, rabbi_en };
}

async function main() {
    console.log("🔧 REPAIR SCRIPT: Fixing missing rabbi_he, rabbi_en, title_en\n");

    // Find all Hebrew files
    const allFiles = fs.readdirSync(DATA_DIR);
    const hebrewFiles = allFiles.filter(f => 
        (f.match(/^Adar \d+ edit\.docx$/i) || f.match(/^peninei \d+\.docx$/i))
    ).sort();
    const englishFiles = allFiles.filter(f =>
        (f.match(/^Adar \d+ English/i) || f.match(/^Peninei \d+ English/i))
    ).sort();

    console.log(`📂 Found ${hebrewFiles.length} Hebrew files, ${englishFiles.length} English files\n`);

    // Phase 1: Parse ALL Hebrew files to get rabbi names
    const rabbiMap = new Map(); // storyId -> rabbi_name
    
    for (const file of hebrewFiles) {
        const filePath = path.join(DATA_DIR, file);
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const stories = splitHebrewStories(result.value);
            
            let found = 0;
            for (const story of stories) {
                const parsed = parseHebrewStory(story);
                if (parsed.id && parsed.rabbi_name) {
                    rabbiMap.set(parsed.id, parsed.rabbi_name);
                    found++;
                }
            }
            console.log(`  📖 ${file}: ${stories.length} stories, ${found} rabbi names extracted`);
        } catch (e) {
            console.error(`  ❌ Error reading ${file}: ${e.message}`);
        }
    }

    console.log(`\n📊 Total rabbi names extracted: ${rabbiMap.size}`);

    // Phase 2: Parse English files for rabbi_en and title_en
    const englishMap = new Map(); // storyId -> { rabbi_en, title_en }

    for (const file of englishFiles) {
        const filePath = path.join(DATA_DIR, file);
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const splitRegex = /^(?:###\s*)?NEW\s*STORY/im;
            const blocks = result.value.split(splitRegex);

            let found = 0;
            for (const block of blocks) {
                const parsed = parseEnglishBlock(block);
                if (parsed.id && (parsed.rabbi_en || parsed.title_en)) {
                    englishMap.set(parsed.id, {
                        rabbi_en: parsed.rabbi_en,
                        title_en: parsed.title_en
                    });
                    found++;
                }
            }
            console.log(`  📖 ${file}: ${blocks.length} blocks, ${found} with rabbi/title`);
        } catch (e) {
            console.error(`  ❌ Error reading ${file}: ${e.message}`);
        }
    }

    console.log(`\n📊 English data extracted: ${englishMap.size} stories`);

    // Phase 3: Query DB for stories missing rabbi_he
    console.log("\n🔍 Querying database for stories with missing fields...");
    
    const { data: missingStories, error } = await supabase
        .from('stories')
        .select('story_id, rabbi_he, rabbi_en, title_en')
        .or('rabbi_he.is.null,rabbi_en.is.null,title_en.is.null');

    if (error) {
        console.error("❌ DB error:", error.message);
        return;
    }

    console.log(`Found ${missingStories.length} stories with at least one missing field`);

    // Phase 4: Update stories
    let updatedRabbiHe = 0;
    let updatedRabbiEn = 0;
    let updatedTitleEn = 0;
    let errors = 0;

    const BATCH_SIZE = 10;
    
    for (let i = 0; i < missingStories.length; i += BATCH_SIZE) {
        const batch = missingStories.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (story) => {
            const updatePayload = {};
            
            // Fix rabbi_he if missing
            if (!story.rabbi_he && rabbiMap.has(story.story_id)) {
                updatePayload.rabbi_he = rabbiMap.get(story.story_id);
            }
            
            // Fix rabbi_en if missing
            if (!story.rabbi_en && englishMap.has(story.story_id)) {
                const en = englishMap.get(story.story_id);
                if (en.rabbi_en) updatePayload.rabbi_en = en.rabbi_en;
            }
            
            // Fix title_en if missing
            if (!story.title_en && englishMap.has(story.story_id)) {
                const en = englishMap.get(story.story_id);
                if (en.title_en) updatePayload.title_en = en.title_en;
            }
            
            if (Object.keys(updatePayload).length === 0) return;
            
            const { error: updateErr } = await supabase
                .from('stories')
                .update(updatePayload)
                .eq('story_id', story.story_id);
            
            if (updateErr) {
                console.error(`  ❌ Failed to update ${story.story_id}: ${updateErr.message}`);
                errors++;
            } else {
                if (updatePayload.rabbi_he) updatedRabbiHe++;
                if (updatePayload.rabbi_en) updatedRabbiEn++;
                if (updatePayload.title_en) updatedTitleEn++;
            }
        }));
        
        if (i % 50 === 0) process.stdout.write('.');
    }

    console.log("\n\n✅ REPAIR COMPLETE!");
    console.log(`   rabbi_he updated: ${updatedRabbiHe}`);
    console.log(`   rabbi_en updated: ${updatedRabbiEn}`);
    console.log(`   title_en updated: ${updatedTitleEn}`);
    console.log(`   errors: ${errors}`);
    
    // Phase 5: Verify
    console.log("\n🔍 Verification...");
    const { data: stillMissing } = await supabase
        .from('stories')
        .select('story_id', { count: 'exact', head: true })
        .is('rabbi_he', null);
    
    // Need a separate query for count
    const { count: missingCount } = await supabase
        .from('stories')
        .select('story_id', { count: 'exact', head: true })
        .is('rabbi_he', null);
    
    console.log(`   Stories still missing rabbi_he: ${missingCount || 0}`);
    
    const { count: missingEnCount } = await supabase
        .from('stories')
        .select('story_id', { count: 'exact', head: true })
        .is('rabbi_en', null);
    
    console.log(`   Stories still missing rabbi_en: ${missingEnCount || 0}`);
}

main().catch(console.error);
