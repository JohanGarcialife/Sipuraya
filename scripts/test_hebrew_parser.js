const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Test parsing Hebrew file with new logic

async function testHebrewParsing() {
    const heFile = path.join(__dirname, 'data', 'Adar 02 edit.docx');
    
    console.log('Reading Hebrew file...');
    const result = await mammoth.extractRawText({ path: heFile });
    const text = result.value;
    
    // Split by ###NEW STORY
    const splitRegex = /###\\s*NEW\\s*STORY/i;
    const blocks = text.split(splitRegex);
    
    console.log(`\\nFound ${blocks.length} blocks\\n`);
    
    // Test parsing first few blocks
    for (let i = 0; i < Math.min(5, blocks.length); i++) {
        const block = blocks[i];
        const parsed = parseHebrewBlock(block);
        
        console.log(`=== Block ${i + 1} ===`);
        console.log(`ID: ${parsed.id || 'NOT FOUND'}`);
        console.log(`Body length: ${(parsed.body || '').length} chars`);
        console.log(`Body preview: ${(parsed.body || '').substring(0, 150).replace(/\\n/g, ' ')}...`);
        console.log('');
    }
}

function cleanId(id) {
    if (!id) return null;
    return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line) {
    let match = line.match(/(Ad\\d+)/i);
    if (match) return match[1];
    match = line.match(/(\\d+Ad)/i);
    if (match) {
        const numbers = match[1].replace(/Ad/i, '');
        return `Ad${numbers}`;
    }
    return null;
}

function parseHebrewBlock(block) {
    const lines = block.replace(/\\r\\n/g, '\\n').split('\\n');
    const storyData = {};
    let bodyStarted = false;
    let bodyBuffer = [];
    
    // Hebrew format: #סיפור_מספר: AdXXXX followed by ALL content until next story
    // No structured metadata tags - everything after ID is body
    
    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        
        // 1. Check for Hebrew ID tag: #סיפור_מספר: Ad0069
        if (cleanLine.includes('#סיפור_מספר:') || cleanLine.includes('סיפור_מספר')) {
            const foundId = smartFindId(cleanLine);
            if (foundId) {
                storyData.id = cleanId(foundId);
                bodyStarted = true; // Everything after this is body
                continue; // Don't include the ID line in body
            }
        }
        
        // 2. Skip separator lines
        if (cleanLine === '###NEW STORY' || cleanLine.startsWith('###רבי') || cleanLine.startsWith('###א\'')) {
            continue;
        }
        
        // 3. Everything else is part of the body
        if (bodyStarted) {
            // Skip only very obvious page numbers
            if (/^\\d+$/.test(cleanLine) && cleanLine.length <= 2) continue;
            bodyBuffer.push(cleanLine);
        }
    }
    
    storyData.body = bodyBuffer.join('\\n').trim();
    return storyData;
}

testHebrewParsing().catch(console.error);
