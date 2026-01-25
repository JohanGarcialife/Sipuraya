const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line) {
    let match = line.match(/(Ad\d+)/i);
    if (match) return match[1];
    match = line.match(/(\d+Ad)/i);
    if (match) {
        const numbers = match[1].replace(/Ad/i, '');
        return `Ad${numbers}`;
    }
    return null;
}

function splitHebrewStories(text) {
  const stories = [];
  const regex = /#סיפור_מספר:\s*(Ad\d+)/gi;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      id: match[1],
      position: match.index
    });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].position;
    const end = i < matches.length - 1 ? matches[i + 1].position : text.length;
    const content = text.substring(start, end);
    
    stories.push({
      id: cleanId(matches[i].id),
      content: content
    });
  }
  
  return stories;
}

function parseHebrewStory(story) {
  const lines = story.content.split(/\r\n|\n|\r|\u2028/);
  let bodyBuffer = [];
  let skipFirst = true;
  
  console.log(`\n=== Parsing ${story.id} ===`);
  console.log(`Total lines: ${lines.length}`);
  
  let lineCount = 0;
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    lineCount++;
    if (lineCount <= 5) {
      console.log(`Line ${lineCount}: "${cleanLine.substring(0, 80)}"`);
    }
    
    if (skipFirst && (cleanLine.includes('#סיפור_מספר:') || cleanLine.includes('סיפור_מספר'))) {
      console.log('  -> Skipping ID line');
      skipFirst = false;
      continue;
    }
    
    if (cleanLine === '###NEW STORY') {
      console.log('  -> Skipping ###NEW STORY');
      continue;
    }
    
    if (/^\d$/.test(cleanLine)) {
      console.log('  -> Skipping single digit');
      continue;
    }
    
    bodyBuffer.push(cleanLine);
  }
  
  console.log(`Body buffer size: ${bodyBuffer.length} lines`);
  console.log(`Body length: ${bodyBuffer.join('\n').trim().length} chars`);
  
  return {
    id: story.id,
    body: bodyBuffer.join('\n').trim()
  };
}

async function test() {
    const heFile = path.join(__dirname, 'data', 'Adar 02 edit.docx');
    const result = await mammoth.extractRawText({ path: heFile });
    const stories = splitHebrewStories(result.value);
    
    console.log(`Total stories: ${stories.length}\n`);
    
    // Test first story in detail
    const parsed = parseHebrewStory(stories[0]);
}

test();
