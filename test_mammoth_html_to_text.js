const fs = require('fs');
const mammoth = require('mammoth');

async function testExtraction() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 04 Heb.docx';
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    let html = result.value;
    
    // Convert paragraph ends and breaks to newlines
    let text = html
      .replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/?[^>]+(>|$)/g, ""); // strip any remaining xml/html tags
      
    // Unescape common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
      
    console.log("--- PROCESSED TEXT ---");
    console.log(text.substring(0, 1000));
    
  } catch (error) {
    console.error("Error reading docx:", error);
  }
}

testExtraction();
