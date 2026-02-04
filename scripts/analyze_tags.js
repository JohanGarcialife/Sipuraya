const fs = require('fs');
const mammoth = require('mammoth');

async function analyzeTags() {
  const filePath = './data/Adar 01 English.docx';
  
  console.log('📖 Reading:', filePath, '\n');
  
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Find story Ad0033
  const stories = text.split(/###NEW STORY/i);
  
  for (let story of stories) {
    if (story.includes('Ad0033')) {
      console.log('='.repeat(80));
      console.log('Story Ad0033 - RAW CONTENT');
      console.log('='.repeat(80));
      
      // Extract ALL ### lines
      const lines = story.split('\n');
      const tagLines = lines.filter(l => l.includes('###') && l.trim());
      
      console.log('\nAll ### Tagged Lines:');
      tagLines.forEach((line, idx) => {
        console.log(`${String(idx+1).padStart(2, '0')}: ${line.trim()}`);
      });
      
      break;
    }
  }
}

analyzeTags().catch(console.error);
