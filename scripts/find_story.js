const fs = require('fs');
const mammoth = require('mammoth');

async function findStory() {
  const filePath = './data/Adar 01 English.docx';
  
  console.log('📖 Reading file:', filePath);
  
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Find story Ad0033
  const stories = text.split(/###NEW STORY/i);
  
  for (let i = 0; i < stories.length; i++) {
    if (stories[i].includes('Ad0033')) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`FOUND: Story Ad0033 (Block #${i})`);
      console.log('='.repeat(80));
      console.log(stories[i].substring(0, 2000));
      break;
    }
  }
}

findStory().catch(console.error);
