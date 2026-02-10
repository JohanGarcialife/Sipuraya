const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

async function inspectFile() {
  const filePath = path.join(__dirname, 'data', 'Adar 14 edit.docx');
  
  if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return;
  }
  
  console.log('📖 Reading file:', filePath);
  
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Find specific stories mentioned: Ad1289
  // We'll look for the ID and print surrounding text
  
  const targetId = 'Ad1289';
  const index = text.indexOf(targetId);
  
  if (index === -1) {
      console.log(`❌ Target ID ${targetId} not found in text.`);
      // Print first 500 chars to see what logic to use
      console.log('First 500 chars:', text.substring(0, 500));
  } else {
      console.log(`✅ Found ${targetId} at index ${index}`);
      
      const start = Math.max(0, index - 500);
      const end = Math.min(text.length, index + 2000);
      
      console.log(`\n--- CONTEXT FOR ${targetId} ---`);
      console.log(text.substring(start, end));
      console.log('-------------------------------');
  }

    // Also look for Ad1409
    const targetId2 = 'Ad1409';
    const index2 = text.indexOf(targetId2);
    if (index2 !== -1) {
        console.log(`\n✅ Found ${targetId2} at index ${index2}`);
        const start = Math.max(0, index2 - 500);
        const end = Math.min(text.length, index2 + 2000);
        console.log(`\n--- CONTEXT FOR ${targetId2} ---`);
        console.log(text.substring(start, end));
        console.log('-------------------------------');
    }
}

inspectFile().catch(console.error);
