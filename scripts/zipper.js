const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const fs = require('fs');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const OpenAI = require('openai');

// --- CONFIG ---
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const DATA_DIR = path.join(__dirname, 'data'); 
const OUTPUT_JSON = path.join(__dirname, 'ready_to_upload.json');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY }); 

const MONTH_MAP = {
  'nisan': 1, 'iyar': 2, 'sivan': 3, 'tamuz': 4, 'av': 5, 'elul': 6,
  'tishrei': 7, 'cheshvan': 8, 'kislev': 9, 'tevet': 10, 'shevat': 11,
  'adar': 12, 'adar i': 12, 'adar ii': 13, 'adar 1': 12, 'adar 2': 13
};

// --- HELPERS ---
function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line) {
    let match = line.match(/(Ad\d+)/i);
    if (match) return match[1];
    match = line.match(/(\d+Ad)/i);
    if (match) {
        const numbers = match[1].replace(/Ad/i, '');
        return `Ad${numbers}`;
    }
    return null;
}

// --- FILE READING ---
function findDataFiles() {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    return { pathEn: path.join(DATA_DIR, args[0]), pathHe: path.join(DATA_DIR, args[1]) };
  }
  return null; 
}

async function getFileContent(filePath) {
  if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
  }
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text.replace(/\n\n+/g, '\n'); 
    } else {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    return null;
  }
}

// --- PARSING LOGIC FOR ENGLISH BLOCKS ---
function parseStoryBlock(block) {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  const storyData = {};
  let bodyBuffer = [];
  let tagsBuffer = [];  // NEW: Extract tags from ### lines

  const regexDate = /###Date:|###תאריך:|Date:|תאריך:/i;
  const regexTitleEn = /###English Title:|English Title:|Title:/i;
  const regexTitleHe = /###KOTERET:|###Hebrew Title:|KOTERET:|Hebrew Title:/i;
  
  const IGNORE_PATTERNS = [
      /^###English Translation/i,
      /^###Hebrew Translation/i,
      /^Start of OCR/i,
      /^End of OCR/i,
      /^Screenshot for page/i
  ];

  lines.forEach(line => {
    let cleanLine = line.trim();
    if (!cleanLine) return;

    if (cleanLine.includes('Ad') || cleanLine.includes('Story ID')) {
        const foundId = smartFindId(cleanLine);
        if (foundId) {
            storyData.id = cleanId(foundId);
            return; 
        }
    }

    if (cleanLine.includes('###') || regexDate.test(cleanLine)) {
        if (regexDate.test(cleanLine)) {
            const rawDate = cleanLine.replace(/###|Date:|תאריך:/gi, '').trim(); 
            const dayMatch = rawDate.match(/(\d+)/);
            if (dayMatch) storyData.day = parseInt(dayMatch[1]);

            const lowerDate = rawDate.toLowerCase();
            for (const [monthName, index] of Object.entries(MONTH_MAP)) {
                if (lowerDate.includes(monthName)) {
                    storyData.month = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    storyData.monthIndex = index;
                    break; 
                }
            }
            if (!storyData.month) {
                 const parts = rawDate.split(' ');
                 if (parts.length > 2 && parts[1].toLowerCase() === 'of') {
                     storyData.month = parts[2].charAt(0).toUpperCase() + parts[2].slice(1).toLowerCase();
                 } else if (parts.length > 1 && parts[1].toLowerCase() !== 'of') {
                     storyData.month = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
                 } else if (parts.length > 2) {
                     storyData.month = parts[2].charAt(0).toUpperCase() + parts[2].slice(1).toLowerCase();
                 }
            }
            return;
        }

        if (regexTitleEn.test(cleanLine)) {
            storyData.title_en = cleanLine.replace(regexTitleEn, '').replace(/###/g, '').trim();
            return;
        }
        if (regexTitleHe.test(cleanLine)) {
            storyData.title_he = cleanLine.replace(regexTitleHe, '').replace(/###/g, '').trim();
            return;
        }
        return; 
    } 
    
    // EXTRACTION STEP: Extract tags from ### lines (not title/date/known patterns)
    if (cleanLine.startsWith('###')) {
      // Skip known metadata patterns that are NOT tags
      if (!regexTitleEn.test(cleanLine) && 
          !regexTitleHe.test(cleanLine) &&
          !regexDate.test(cleanLine) &&
          cleanLine !== '###NEW STORY' &&
          !IGNORE_PATTERNS.some(pattern => pattern.test(cleanLine))) {
        // Extract tag content (remove ### delimiters)
        const tag = cleanLine.replace(/^###|###$/g, '').trim();
        if (tag && tag.length > 0) {
          tagsBuffer.push(tag);
        }
      }
      return; // Don't add to body
    }
    
    if (IGNORE_PATTERNS.some(pattern => pattern.test(cleanLine))) return;
    if (/^\d+$/.test(cleanLine) && cleanLine.length <= 3) return;

    bodyBuffer.push(cleanLine);
  });

  storyData.body = bodyBuffer.join('\n').trim();
  storyData.tags = tagsBuffer;  // NEW: Include extracted tags
  return storyData;
}

// --- SPECIAL SPLIT FOR HEBREW FILES ---
// Hebrew format: #סיפור_מספר: Ad0100 comes BEFORE ###NEW STORY
// So we need to split by the ID tag, not by ###NEW STORY
function splitHebrewStories(text) {
  const stories = [];
  
  // Split by the Hebrew ID tag pattern
  const regex = /#סיפור_מספר:\s*(Ad\d+)/gi;
  const matches = [];
  let match;
  
  // Find all ID positions
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      id: match[1],
      position: match.index,
      fullMatch: match[0]
    });
  }
  
  // Extract content between IDs
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].position;
    const end = i < matches.length - 1 ? matches[i + 1].position : text.length;
    const content = text.substring(start, end);
    
    stories.push({
      id: cleanId(matches[i].id),
      content: content
    });
  }
  
  return stories;
}

// --- PARSE HEBREW STORY CONTENT ---
// CRITICAL FIX: mammoth extracts Hebrew content as ONE LONG STRING without proper line breaks
// Content format: "#סיפור_מספר: Ad0062###BIOGRAPHY###רבי עמנואל חי ריקי...all text..."
// We can't rely on line splits - just extract everything after the ID tag
function parseHebrewStory(story) {
  let content = story.content;
  const tags = [];
  
  // Remove the ID tag at the beginning
  content = content.replace(/#סיפור_מספר:\s*Ad\d+/i, '');
  
  // EXTRACTION STEP: Extract ###...### patterns as tags BEFORE removing them
  const tagPattern = /###([^#\n]+)###/g;
  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const tag = match[1].trim();
    // Skip ONLY known metadata patterns that are NOT actual tags
    if (tag && 
        tag !== 'NEW STORY' &&
        !tag.match(/^English Translation/i) &&
        !tag.match(/^Hebrew Translation/i)) {
      tags.push(tag);
    }
  }
  
  // CLEANING STEP: Remove ALL ### patterns completely
  // Strategy: Remove everything that starts with ### until we hit actual Hebrew content
  
  // Step 1: Remove closed patterns like ###BIOGRAPHY###
  content = content.replace(/###[^#]+###/g, '');
  
  // Step 2: Remove ###NEW STORY
  content = content.replace(/###NEW STORY/gi, '');
  
  // Step 3: Remove any remaining ### followed by any characters
  // This catches patterns like "###א' אדר" that are open-ended
  content = content.replace(/###[^\u05d0-\u05ea]*([א-ת'])/gu, '$1');
  
  // Step 4: Final cleanup - remove any stray ### that might remain
  content = content.replace(/###/g, '');
  
  // Clean up multiple spaces and trim
  const body = content.replace(/\s+/g, ' ').trim();
  
  return {
    id: story.id,
    body: body,
    tags: tags  // NEW: Include extracted tags
  };
}

// --- AI EMBEDDING ---
async function generateEmbedding(text) {
  if (!OPENAI_API_KEY || !text || text.length < 5) return null;
  try {
    const cleanText = text.replace(/\s+/g, ' ').slice(0, 4000); 
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (e) {
    console.warn(`⚠️ AI Warning: ${e.message}`);
    return null; 
  }
}

// --- MAIN ---
async function main() {
  const files = findDataFiles();
  if (!files) return;

  const textEn = await getFileContent(files.pathEn);
  const textHe = await getFileContent(files.pathHe);

  if (!textEn || !textHe) return;

  // Process English (standard split)
  const splitRegex = /###\s*NEW\s*STORY/i;
  const rawStoriesEn = textEn.split(splitRegex);

  // Process Hebrew (special split by ID tag)
  const rawStoriesHe = splitHebrewStories(textHe);

  console.log(`📊 Processing: EN (${rawStoriesEn.length}) | HE (${rawStoriesHe.length})`);

  const storiesMap = new Map();

  // Process English
  rawStoriesEn.forEach(block => {
    const data = parseStoryBlock(block);
    if (data.id) {
      storiesMap.set(data.id, {
        external_id: data.id,
        hebrew_day: data.day || 1,
        hebrew_month: data.month || 'Adar',
        hebrew_month_index: data.monthIndex || 12,
        title_en: data.title_en,
        body_en: data.body, 
        title_he: data.title_he || null, 
        body_he: null,
        tags: data.tags || []  // NEW: Include English tags
      });
    }
  });

  // Process Hebrew - Merge by ID
  let mergedCount = 0;
  rawStoriesHe.forEach(heStory => {
    const parsed = parseHebrewStory(heStory);
    
    if (parsed.id && storiesMap.has(parsed.id)) {
      const existing = storiesMap.get(parsed.id);
      if (parsed.body && parsed.body.length > 10) {
        existing.body_he = parsed.body;
        // Merge Hebrew tags with existing English tags
        if (parsed.tags && parsed.tags.length > 0) {
          existing.tags = [...existing.tags, ...parsed.tags];
        }
        mergedCount++;
      } else {
        console.log(`⚠️  ID ${parsed.id}: body too short (${parsed.body ? parsed.body.length : 0} chars)`);
      }
    } else {
      console.log(`⚠️  ID ${parsed.id}: not found in EN map or no ID`);
    }
  });
  console.log(`\n🔄 Merged ${mergedCount} Hebrew bodies`);

  const finalArray = Array.from(storiesMap.values());
  
  // Generate Embeddings & Append to JSON
  let processedData = [];
  for (let i = 0; i < finalArray.length; i++) {
      const story = finalArray[i];
      const textForAI = story.body_he || story.body_en;
      const embedding = await generateEmbedding(textForAI);
      
      processedData.push({
          ...story,
          embedding,
          is_published: true
      });
      
      if (i % 10 === 0) process.stdout.write('.');
  }

  // Save to JSON (Append mode)
  let existingData = [];
  if (fs.existsSync(OUTPUT_JSON)) {
      try {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_JSON));
      } catch(e) {}
  }
  
  const allData = [...existingData, ...processedData];
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allData, null, 2));

  console.log(`\n✅ Saved ${processedData.length} stories to JSON.`);
}

main();