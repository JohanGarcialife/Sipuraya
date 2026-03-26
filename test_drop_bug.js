const mammoth = require('mammoth');

function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function isMetaLine(line) {
  const t = line.trim();
  if (t.startsWith('#')) return true;
  if (/^(NEW STORY|KOTERET|BIOGRAPHY|English Translation|Hebrew Translation)/i.test(t)) return true;
  return false;
}

const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

function parseHebrewStory(storyContent, storyId) {
  const rawLines = storyContent.split('\n');
  let rabbi_name = null;
  const bodyLines = [];

  // Pass 1
  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    if (!t.startsWith('###')) continue;
    const inner = t.replace(/^###|###$/g, '').trim();
    if (!inner || /^(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(inner)) continue;
    if (inner.includes('סיפור_מספר')) continue;
    if (inner.length > 100) continue;
    const datePat = new RegExp(`^[א-ת]['"׳״]?[א-ת]*\\s+(${hebrewMonths})`, 'i');
    if (datePat.test(inner)) continue;
    if (/[\u05d0-\u05ea]/.test(inner)) {
      rabbi_name = inner;
      break;
    }
  }

  // Pass 2 fallback... skipped if rabbi_name set

  // Body loop
  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    if (!t) continue;
    if (isMetaLine(t)) continue;
    
    const cleanT = t.replace(/^###|###$/g, '').trim();
    if (rabbi_name && cleanT === rabbi_name) continue;
    if (dateMarkerPattern.test(t)) continue;

    bodyLines.push(t);
  }

  return {
    id: storyId,
    body: bodyLines.join('\n').trim(),
    rabbi_name
  };
}

async function testMerge() {
  const filePath = '/Users/johan/Desktop/Proyectos/Sipuraya Project/sipuraya/file/Nissan 01 Heb (2).docx';
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    let html = result.value;
    let text = html.replace(/<\/p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<\/?[^>]+(>|$)/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    const rawStoriesHe = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const endMarker = text.indexOf('#סיפור_מספר:', start + 1);
      const end = endMarker !== -1 ? endMarker : text.length;
      rawStoriesHe.push({
        id: cleanId(match[1]),
        content: text.substring(start, end)
      });
    }

    // SIMULATE A MISMATCH
    const storiesMap = new Map();
    // Suppose storiesMap only has Ni0314 (but not Ni0044)
    storiesMap.set('Ni0314', { story_id: 'Ni0314', body_he: null });
    
    console.log("Starting simulation with rawStoriesHe.length =", rawStoriesHe.length);

    rawStoriesHe.forEach(heStory => {
      const data = parseHebrewStory(heStory.content, heStory.id);
      if (data.id && storiesMap.has(data.id)) {
        const existing = storiesMap.get(data.id);
        if (data.body && data.body.length > 2) existing.body_he = data.body;
      } else {
         // THIS IS THE MISSING PART IN route.ts IF storiesMap.size > 0
         if (data.id === 'Ni0044') {
            console.log("DROPPED: Ni0044 - Not found in storiesMap!");
         }
      }
    });

  } catch (err) { console.error(err); }
}

testMerge();
