const path = require('path');
const mammoth = require('mammoth');
const fs = require('fs');

async function inspectHebrewFile(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    
    console.log(`\n📖 Reading: ${filename}`);
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    console.log(`Total length: ${text.length} chars`);
    
    // Split by Hebrew ID tag (same as parseHebrewStory)
    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            id: match[1],
            position: match.index,
        });
    }
    
    console.log(`Found ${matches.length} stories`);
    
    // Show first 3 stories' raw content
    for (let i = 0; i < Math.min(3, matches.length); i++) {
        const start = matches[i].position;
        const end = i < matches.length - 1 ? matches[i + 1].position : Math.min(start + 2000, text.length);
        let content = text.substring(start, end);
        
        console.log(`\n--- Story ${matches[i].id} ---`);
        console.log(`Raw (first 500 chars): ${content.substring(0, 500)}`);
        
        // Try rabbi extraction
        content = content.replace(/#סיפור_מספר:\s*[A-Za-z]{2}\d+/i, '');
        content = content.replace(/###NEW STORY/gi, '');
        
        const rabbiMatch = content.match(/###([^#]+)###/);
        console.log(`Rabbi match: ${rabbiMatch ? rabbiMatch[1] : 'NONE'}`);
        
        // Show all ### patterns
        const allPatterns = [...content.matchAll(/###([^#]+)###/g)];
        console.log(`All ### patterns: ${allPatterns.map(m => m[1]).join(' | ') || 'NONE'}`);
        
        // Check if rabbi name appears WITHOUT ### wrapping
        // Maybe the format changed in later pages
        const firstLine = content.trim().split('\n')[0];
        console.log(`First line after cleanup: "${firstLine?.substring(0, 200)}"`);
    }
}

async function main() {
    // Check files from pages that have data (page 11 = Adar 11) and pages that don't (page 13 = Adar 13)
    await inspectHebrewFile('Adar 11 edit.docx');  // Has data
    await inspectHebrewFile('Adar 13 edit.docx');  // Missing rabbi_he
    await inspectHebrewFile('Adar 14 edit.docx');  // Missing rabbi_he
    await inspectHebrewFile('Adar 22 edit.docx');  // Missing everything
    await inspectHebrewFile('peninei 346.docx');   // Check peninei format
}

main().catch(console.error);
