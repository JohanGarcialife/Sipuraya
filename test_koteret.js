const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Replicating logic from src/app/api/ingest/route.ts
const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

function cleanId(id) {
  if (!id) return null;
  const match = id.match(/([A-Za-z]+)(\d+)/);
  if (!match) return id.trim().toUpperCase();

  let prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  if (prefix === 'Ly') prefix = 'Iy';

  const num = parseInt(match[2], 10);
  return `${prefix}${num}`;
}

async function extractText(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    let text = result.value
        .replace(/<\/p>/g, '\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<\/?[^>]+(>|$)/g, ""); 
    return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function splitHebrewStories(text) {
    const stories = [];
    const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
    let match;
    const matches = [];
    while ((match = regex.exec(text)) !== null) {
        matches.push({ id: match[1], pos: match.index, full: match[0] });
    }
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].pos;
        const end = i < matches.length - 1 ? matches[i + 1].pos : text.length;
        stories.push({ id: cleanId(matches[i].id), content: text.substring(start, end) });
    }
    return stories;
}

function parseHebrewStory(story) {
  const rawContent = story.content;
  const rawLines = rawContent.split('\n');
  let title_he = null;
  let rabbi_name = null;

  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    const match = t.match(/^(?:###)?\s*(?:KOTERET|Hebrew Title|Title):\s*(.+)/i);
    if (match) {
      title_he = match[1].replace(/^###|###$/g, '').trim();
      break;
    }
  }

  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    if (!t.startsWith('###')) continue;
    const inner = t.replace(/^###|###$/g, '').trim();
    if (!inner || /^(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(inner)) continue;
    if (inner.includes('סיפור_מספר')) continue;
    if (inner.length > 100) continue;
    
    if (/[\u05d0-\u05ea]/.test(inner) && !dateMarkerPattern.test(inner)) {
      rabbi_name = inner;
      break;
    }
  }

  return { id: story.id, title_he: title_he || rabbi_name, rabbi_name: rabbi_name };
}

async function verify() {
    const hebPath = path.join(__dirname, 'file', 'Iyar 02 Heb.docx');
    const textHe = await extractText(hebPath);
    const rawStoriesHe = splitHebrewStories(textHe);

    console.log(`Extracted ${rawStoriesHe.length} Hebrew stories. Examples:`);
    for (let i = 0; i < 5; i++) {
        const parsed = parseHebrewStory(rawStoriesHe[i]);
        console.log(`- ${parsed.id} | KOTERET: ${parsed.title_he} | RABBI: ${parsed.rabbi_name}`);
    }
}

verify();
