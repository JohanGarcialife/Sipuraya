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
      
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

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

    console.log(`Found ${stories.length} stories.`);

    for (const story of stories) {
      const bodyLines = [];
      let rabbi_name = null;
      const rawLines = story.content.split('\n');

      // Simple Rabbi Extraction (Pass 1)
      for (const rawLine of rawLines) {
        const t = rawLine.trim();
        if (t.startsWith('###')) {
          const inner = t.replace(/^###|###$/g, '').trim();
          if (inner && !/^(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(inner)) {
             if (!inner.includes('סיפור_מספר')) {
                const datePat = new RegExp(`^[א-ת]['"׳״]?[א-ת]*\\s+(${hebrewMonths})`, 'i');
                if (!datePat.test(inner) && /[\u05d0-\u05ea]/.test(inner)) {
                  rabbi_name = inner;
                  break;
                }
             }
          }
        }
      }

      // Body loop
      for (const rawLine of rawLines) {
        const t = rawLine.trim();
        if (!t) continue;
        if (isMetaLine(t)) continue;
        if (rabbi_name && t.replace(/^###|###$/g, '').trim() === rabbi_name) continue;
        if (dateMarkerPattern.test(t)) continue;
        bodyLines.push(t);
      }

      if (bodyLines.length === 0) {
        console.log(`\n--- EMPTY BODY DETECTED: ${story.id} ---`);
        console.log("Raw lines was:");
        console.log(rawLines.slice(0, 5));
      }
    }

  } catch (error) {
    console.error(error);
  }
}

testExtraction();
