const fs = require('fs');
const mammoth = require('mammoth');

async function compareFields() {
  const enFile = './data/Adar 01 English.docx';
  const heFile = './data/Adar 01 edit.docx';
  
  console.log('📖 Comparing English and Hebrew files for Ad0033 (The Shach)...\n');
  
  // Read English
  const enResult = await mammoth.extractRawText({ path: enFile });
  const enText = enResult.value;
  const enStories = enText.split(/###NEW STORY/i);
  
  // Read Hebrew  
  const heResult = await mammoth.extractRawText({ path: heFile });
  const heText = heResult.value;
  const heStories = heText.split(/#סיפור_מספר:/i);
  
  // Find Ad0033 in English
  for (let story of enStories) {
    if (story.includes('Ad0033')) {
      console.log('='.repeat(80));
      console.log('ENGLISH FILE - Story Ad0033');
      console.log('='.repeat(80));
      const lines = story.split('\n').filter(l => l.trim()).slice(0, 15);
      lines.forEach(line => console.log(line));
      break;
    }
  }
  
  console.log('\n');
  
  // Find Ad0033 in Hebrew
  for (let story of heStories) {
    if (story.includes('Ad0033')) {
      console.log('='.repeat(80));
      console.log('HEBREW FILE - Story Ad0033');
      console.log('='.repeat(80));
      const lines = story.split('\n').filter(l => l.trim()).slice(0, 20);
      lines.forEach(line => console.log(line));
      break;
    }
  }
}

compareFields().catch(console.error);
