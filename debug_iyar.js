const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const MONTH_MAP = {
  'nissan': 1,
  'iyar': 2,
  'sivan': 3,
  'tamuz': 4,
  'av': 5,
  'elul': 6,
  'tishrei': 7,
  'cheshvan': 8,
  'kislev': 9,
  'tevet': 10,
  'shevat': 11,
  'adar': 12,
  'adar i': 12,
  'adar ii': 13,
};

async function extractText(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    let text = result.value
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

    return text;
}

function cleanId(id) {
    if (!id) return null;
    const match = id.match(/([A-Za-z]+)(\d+)/);
    if (!match) return id.trim().toUpperCase();
    let prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    
    // NORMALIZE TYPOS: 'Ly' -> 'Iy'
    if (prefix === 'Ly') prefix = 'Iy';
    
    const num = parseInt(match[2], 10);
    return `${prefix}${num}`;
}

function smartFindId(text) {
    const commonIdPattern = /([A-Za-z]{1,2}\d+)/;
    const match = text.match(commonIdPattern);
    return match ? match[1] : null;
}

function parseStoryBlock(block) {
    const lines = block.replace(/\r\n/g, '\n').split('\n');
    const storyData = {
        id: null,
        day: null,
        month: null,
        title_en: null,
        rabbi_name: null,
        body: null
    };
    
    let bodyBuffer = [];
    const regexDate = /###Date:|Date:|תאריך:/i;
    const regexTitleEn = /###English Title:|English Title:|Title:/i;
    const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:/i;

    lines.forEach(line => {
        let cleanLine = line.trim();
        if (!cleanLine) return;

        if (cleanLine.includes('Story ID') || /([A-Za-z]{2}\d+)/.test(cleanLine)) {
            const foundId = smartFindId(cleanLine);
            if (foundId) {
                storyData.id = cleanId(foundId);
                return;
            }
        }

        if (cleanLine.startsWith('###') || regexDate.test(cleanLine)) {
            if (regexDate.test(cleanLine)) {
                const rawDate = cleanLine.replace(/###|Date:|תאריך:/gi, '').trim();
                const dayMatch = rawDate.match(/(\d+)/);
                if (dayMatch) storyData.day = parseInt(dayMatch[1]);

                const lowerDate = rawDate.toLowerCase();
                for (const [monthName, index] of Object.entries(MONTH_MAP)) {
                    if (lowerDate.includes(monthName)) {
                        storyData.month = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        break;
                    }
                }
                return;
            }
            if (regexTitleEn.test(cleanLine)) {
                storyData.title_en = cleanLine.replace(regexTitleEn, '').replace(/###/g, '').trim();
                return;
            }
            if (regexRabbi.test(cleanLine)) {
                storyData.rabbi_name = cleanLine.replace(regexRabbi, '').replace(/###/g, '').trim();
                return;
            }
            return;
        }
        
        if (!cleanLine.startsWith('###')) {
            bodyBuffer.push(cleanLine);
        }
    });

    storyData.body = bodyBuffer.join('\n').trim();
    return storyData;
}

async function debug() {
    const engPath = path.join(__dirname, 'file', 'Iyar 02 Eng.docx');
    
    const engText = await extractText(engPath);
    const rawStoriesEn = engText.split(/###NEW STORY/i).map(s => s.trim()).filter(s => s.length > 5);
    
    console.log(`Parsed ${rawStoriesEn.length} English stories.`);
    
    for (let i = 0; i < 3; i++) {
        console.log(`\nStory ${i+1}:`);
        const parsed = parseStoryBlock(rawStoriesEn[i]);
        console.log(JSON.stringify(parsed, null, 2));
    }
}

debug();
