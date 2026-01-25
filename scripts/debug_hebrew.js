const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

async function debugHebrew() {
    const heFile = path.join(__dirname, 'data', 'Adar 02 edit.docx');
    
    const result = await mammoth.extractRawText({ path: heFile });
    const text = result.value;
    
    // Split blocks
    const blocks = text.split(/###\s*NEW\s*STORY/i);
    
    console.log(`Total blocks: ${blocks.length}\n`);
    
    // Find first few blocks with ID
    let count = 0;
    for (let i = 0; i < blocks.length && count < 5; i++) {
        const block = blocks[i];
        if (block.includes('סיפור_מספר') || block.includes('Ad')) {
            console.log(`=== Block ${i} ===`);
            console.log(block.substring(0, 500));
            console.log('\n---\n');
            count++;
        }
    }
}

debugHebrew();
