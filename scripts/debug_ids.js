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
  
  console.log(`Found ${matches.length} Hebrew IDs`);
  console.log('First 10 IDs:', matches.slice(0, 10).map(m => cleanId(m.id)));
  
  return matches;
}

async function test() {
    const heFile = path.join(__dirname, 'data', 'Adar 02 edit.docx');
    const result = await mammoth.extractRawText({ path: heFile });
    const matches = splitHebrewStories(result.value);
}

test();
