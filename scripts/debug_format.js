const path = require('path');
const mammoth = require('mammoth');

async function main() {
    const filePath = path.join(__dirname, 'data', 'Adar 13 edit.docx');
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Find Ad1164 content
    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({ id: match[1], position: match.index });
    }
    
    // Show first 3 stories raw
    for (let i = 0; i < Math.min(5, matches.length); i++) {
        const start = matches[i].position;
        const end = i < matches.length - 1 ? matches[i + 1].position : Math.min(start + 2000, text.length);
        let content = text.substring(start, end);
        
        console.log(`\n=== ${matches[i].id} ===`);
        
        // Remove ID and NEW STORY
        content = content.replace(/#סיפור_מספר:\s*[A-Za-z]{1,2}\d+/i, '');
        content = content.replace(/###NEW STORY/gi, '');
        
        // Show ALL ### patterns
        const all = [...content.matchAll(/###([^#]+)###/g)];
        console.log(`  matchAll results (${all.length}):`);
        all.forEach((m, idx) => {
            const val = m[1].trim();
            const isMetadata = /^(KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|NEW STORY)/i.test(val);
            console.log(`    [${idx}] "${val.substring(0, 80)}" ${isMetadata ? '(SKIP)' : '✅ RABBI'}`);
        });
        
        // Look at the raw content to see exactly what's between ###
        const rawMatches = [...content.matchAll(/###/g)];
        console.log(`  ### occurrences: ${rawMatches.length}`);
        
        // Show first 400 chars
        console.log(`  Raw content (200 chars): "${content.substring(0, 200)}"`);
        
        // Check if rabbi name has " that breaks the pattern
        // Format: ###ה"פחד יצחק" מבאיאן זי"ע###
        // The issue: the rabbi name contains " which is not #, so [^#] should match
        // But let me check...
        const altPattern = content.match(/###KOTERET:[^#]+###([^#]+)###/);
        console.log(`  Alt pattern (after KOTERET): ${altPattern ? altPattern[1].substring(0, 80) : 'NO MATCH'}`);
        
        // Manual extraction: everything between 2nd and 3rd ###
        const parts = content.split('###');
        console.log(`  Split by ### (${parts.length} parts):`);
        parts.forEach((p, idx) => {
            if (idx < 8) console.log(`    [${idx}]: "${p.substring(0, 100).replace(/\n/g, '\\n')}"`);
        });
    }
}

main().catch(console.error);
