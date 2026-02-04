const fs = require('fs');
const mammoth = require('mammoth');

async function inspectFile() {
  const filePath = './data/Adar 01 English.docx';
  
  console.log('📖 Reading file:', filePath);
  
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Find the first few stories
  const stories = text.split(/###NEW STORY/i);
  
  console.log(`\n📊 Found ${stories.length} story blocks`);
  
  // Inspect first 3 stories in detail
  for (let i = 1; i <= Math.min(3, stories.length - 1); i++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STORY #${i}`);
    console.log('='.repeat(80));
    
    const story = stories[i];
    const lines = story.split('\n').slice(0, 30); // First 30 lines
    
    lines.forEach((line, idx) => {
      if (line.trim()) {
        console.log(`${String(idx).padStart(2, '0')}: ${line}`);
      }
    });
  }
}

inspectFile().catch(console.error);
