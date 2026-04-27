const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Replicating logic from src/app/api/ingest/route.ts

const MONTH_MAP = {
  'nisan': 1, 'iyar': 2, 'sivan': 3, 'tamuz': 4, 'av': 5, 'elul': 6,
  'tishrei': 7, 'cheshvan': 8, 'kislev': 9, 'tevet': 10, 'shevat': 11,
  'adar': 12, 'adar i': 12, 'adar ii': 13, 'adar 1': 12, 'adar 2': 13
};

const HEBREW_MONTH_NAMES = {
  'Nisan': 'ניסן', 'Nissan': 'ניסן', 'Iyar': 'אייר', 'Sivan': 'סיון',
  'Tamuz': 'תמוז', 'Tammuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
  'Tishrei': 'תשרי', 'Cheshvan': 'חשון', 'Kislev': 'כסלו',
  'Tevet': 'טבת', 'Shevat': 'שבט', 'Adar': 'אדר',
  'Adar I': 'אדר א', 'Adar II': 'אדר ב'
};

const GEMATRIA_MAP = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
  "יא": 11, "יב": 12, "יג": 13, "יד": 14, "טו": 15, "טז": 16, "יז": 17, "יח": 18, "יט": 19, "כ": 20,
  "כא": 21, "כב": 22, "כג": 23, "כד": 24, "כה": 25, "כו": 26, "כז": 27, "כח": 28, "כט": 29, "ל": 30
};

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

function parseStoryBlock(block) {
    const lines = block.replace(/\r\n/g, '\n').split('\n');
    const storyData = { id: null, day: null, month: null, title_en: null, body: null };
    lines.forEach(line => {
        let cleanLine = line.trim();
        if (!cleanLine) return;
        if (cleanLine.includes('Story ID') || /([A-Za-z]{2}\d+)/.test(cleanLine)) {
            const match = cleanLine.match(/\b([A-Za-z]{1,2}\d+)\b/i);
            if (match) storyData.id = cleanId(match[1]);
        }
    });
    return storyData;
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
    const lines = rawContent.split('\n');
    let parsedDay = 1;
    let dateFound = false;
    const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
    const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

    for (const rawLine of lines) {
        const t = rawLine.trim();
        const normalizedLine = t.replace(/^###|###$/g, '').trim();
        if (!dateFound && dateMarkerPattern.test(normalizedLine)) {
            const dateMatch = normalizedLine.match(dateMarkerPattern);
            if (dateMatch) {
                const dayStr = dateMatch[1].replace(/['"׳״]/g, '');
                if (GEMATRIA_MAP[dayStr]) parsedDay = GEMATRIA_MAP[dayStr];
                dateFound = true;
            }
        }
    }
    return { id: story.id, day: parsedDay, dateFound: dateFound };
}

async function verify() {
    const engPath = path.join(__dirname, 'file', 'Iyar 02 Eng.docx');
    const hebPath = path.join(__dirname, 'file', 'Iyar 02 Heb.docx');

    const textEn = await extractText(engPath);
    const textHe = await extractText(hebPath);

    const splitRegex = /^(?:###\s*)?NEW\s*STORY/im;
    const rawStoriesEn = textEn.split(splitRegex).filter(s => s.trim().length > 10);
    const rawStoriesHe = splitHebrewStories(textHe);

    console.log(`Split Counts - EN: ${rawStoriesEn.length}, HE: ${rawStoriesHe.length}`);

    const storiesMap = new Map();
    rawStoriesEn.forEach(block => {
        const data = parseStoryBlock(block);
        if (data.id) storiesMap.set(data.id, { id: data.id, en: true });
    });

    let matchCount = 0;
    let dateFoundCount = 0;
    rawStoriesHe.forEach(heStory => {
        const data = parseHebrewStory(heStory);
        if (storiesMap.has(data.id)) {
            matchCount++;
            if (data.dateFound) dateFoundCount++;
        }
    });

    console.log(`Success! Match Count: ${matchCount}/${rawStoriesEn.length}`);
    console.log(`Hebrew Dates found: ${dateFoundCount}/${rawStoriesHe.length}`);
    
    if (matchCount > 0 && dateFoundCount > 0) {
        console.log("TEST PASSED: IDs match and dates are being found.");
    } else {
        console.log("TEST FAILED: Check logic.");
    }
}

verify();
