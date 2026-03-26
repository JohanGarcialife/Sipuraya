const mammoth = require('mammoth');

const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

function isMetaLine(line) {
  const t = line.trim();
  if (t.startsWith('#')) return true;
  if (/^(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(t)) return true;
  return false;
}

async function testExtraction() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 01 Heb (2).docx';
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    let html = result.value;
    
    let text = html
      .replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/?[^>]+(>|$)/g, "");

    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    const stories = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const endMarker = text.indexOf('#סיפור_מספר:', start + 1);
      const end = endMarker !== -1 ? endMarker : text.length;
      stories.push({
        id: match[1],
        content: text.substring(start, end)
      });
    }

    const story = stories.find(s => s.id === 'Ni0044');
    if (!story) return;

    const bodyLines = [];
    const rawLines = story.content.split('\n');
    let rabbi_name = "הגה\"צ רבי משה יוסף הופמן מפאפא זי\"ע"; // From Pass 1

    console.log(`Using Rabbi Name: "${rabbi_name}"`);

    for (const rawLine of rawLines) {
      const t = rawLine.trim();
      if (!t) {
          console.log(`[PASS] Empty line`);
          continue;
      }

      if (isMetaLine(t)) {
          console.log(`[SKIP] isMetaLine: "${t}"`);
          continue;
      }

      if (rabbi_name && t.replace(/^###|###$/g, '').trim() === rabbi_name) {
          console.log(`[SKIP] rabbi_match: "${t}"`);
          continue;
      }

      if (dateMarkerPattern.test(t)) {
          console.log(`[SKIP] dateMarkerPattern: "${t}"`);
          continue;
      }

      console.log(`[KEEP] bodyLine: "${t}"`);
      bodyLines.push(t);
    }

    console.log("\nFinal Body:");
    console.log(bodyLines.join('\n'));

  } catch (error) {
    console.error(error);
  }
}

testExtraction();
