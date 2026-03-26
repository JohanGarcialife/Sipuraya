const mammoth = require('mammoth');

async function testExtraction() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 04 Eng.docx';
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    const ni44Index = text.indexOf('Ni0044');
    if (ni44Index !== -1) {
      console.log("--- TEXT AROUND Ni0044 in English ---");
      console.log(text.substring(ni44Index - 100, ni44Index + 1000));
    } else {
      console.log("Ni0044 not found in English text!");
    }
  } catch (error) {
    console.error(error);
  }
}

testExtraction();
