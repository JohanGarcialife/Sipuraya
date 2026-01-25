const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function splitHebrewStories(text) {
  const stories = [];
  const regex = /#סיפור_מספר:\s*(Ad\d+)/gi;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      id: match[1],
      position: match.index,
      fullMatch: match[0]
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
  const lines = story.content.replace(/\r\n/g, '\n').split('\n');
  let bodyBuffer = [];
  let skipFirst = true;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    if (skipFirst && (cleanLine.includes('#סיפור_מספר:') || cleanLine.includes('סיפור_מספר'))) {
      skipFirst = false;
      continue;
    }
    
    if (cleanLine === '###NEW STORY') continue;
    if (cleanLine.startsWith('###רבי')) continue;
    if (cleanLine.match(/^###[א-ת]'/)) continue;
    if (/^\d$/.test(cleanLine)) continue;
    
    bodyBuffer.push(cleanLine);
  }
  
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
    
    // Test first 3
    for (let i = 0; i < 3; i++) {
        const parsed = parseHebrewStory(stories[i]);
        console.log(`Story ${i + 1}: ${parsed.id}`);
        console.log(`  Body length: ${parsed.body.length}`);
        console.log(`  Preview: ${parsed.body.substring(0, 100)}...`);
        console.log('');
    }
}

test();
