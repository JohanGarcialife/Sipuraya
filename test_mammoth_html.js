const fs = require('fs');
const mammoth = require('mammoth');

async function testExtraction() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 04 Heb.docx';
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    console.log("--- HTML SNIPPET ---");
    console.log(result.value.substring(0, 500));
  } catch (error) {
    console.error("Error reading docx:", error);
  }
}

testExtraction();
