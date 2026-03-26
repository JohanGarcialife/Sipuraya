const fs = require('fs');
const mammoth = require('mammoth');

async function testExtraction() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 04 Heb.docx';
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    console.log("Characters in first 100:");
    for (let i = 0; i < 100; i++) {
        console.log(`${i}: ${text[i]} (${text.charCodeAt(i)})`);
    }
  } catch (error) {
    console.error("Error reading docx:", error);
  }
}

testExtraction();
