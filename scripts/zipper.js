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

// Hebrew month name mapping (English → Hebrew)
const HEBREW_MONTH_NAMES = {
  'Nisan': 'ניסן',
  'Iyar': 'אייר',
  'Sivan': 'סיון',
  'Tamuz': 'תמוז',
  'Av': 'אב',
  'Elul': 'אלול',
  'Tishrei': 'תשרי',
  'Cheshvan': 'חשון',
  'Kislev': 'כסלו',
  'Tevet': 'טבת',
  'Shevat': 'שבט',
  'Adar': 'אדר',
  'Adar I': 'אדר א׳',
  'Adar II': 'אדר ב׳'
};

// Hebrew gematria numbers for days (1-30)
const HEBREW_DAY_NUMBERS = {
  1: "א'", 2: "ב'", 3: "ג'", 4: "ד'", 5: "ה'",
  6: "ו'", 7: "ז'", 8: "ח'", 9: "ט'", 10: "י'",
  11: "י\"א", 12: "י\"ב", 13: "י\"ג", 14: "י\"ד", 15: "ט\"ו",
  16: "ט\"ז", 17: "י\"ז", 18: "י\"ח", 19: "י\"ט", 20: "כ'",
  21: "כ\"א", 22: "כ\"ב", 23: "כ\"ג", 24: "כ\"ד", 25: "כ\"ה",
  26: "כ\"ו", 27: "כ\"ז", 28: "כ\"ח", 29: "כ\"ט", 30: "ל'"
};

// --- HELPERS ---

// Format Hebrew date: "א' אדר", "י"א ניסן", etc.
function formatHebrewDate(day, monthEnglish) {
  const hebrewDay = HEBREW_DAY_NUMBERS[day] || day.toString();
  const hebrewMonth = HEBREW_MONTH_NAMES[monthEnglish] || monthEnglish;
  return `${hebrewDay} ${hebrewMonth}`;
}

// Format English date: "1 Adar", "15 Nisan", etc. (NO ordinal)
function formatEnglishDate(day, monthEnglish) {
  return `${day} ${monthEnglish}`;
}

// Extract English rabbi name from story content
function extractEnglishRabbiName(englishBody) {
  if (!englishBody) return null;
  
  // Pattern 1: "Rabbi [Name]" at the beginning of the text
  const pattern1 = /^Rabbi\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?)/m;
  const match1 = englishBody.match(pattern1);
  if (match1) return `Rabbi ${match1[1]}`;
  
  // Pattern 2: Look for rabbi name in first few sentences
  const firstPart = englishBody.substring(0, 500);
  const pattern2 = /(?:the\s+)?(?:holy\s+)?Rabbi\s+([A-Z][a-z]+(?:\s+(?:ben\s+)?[A-Z][a-z]+)*)/i;
  const match2 = firstPart.match(pattern2);
  if (match2) return `Rabbi ${match2[1]}`;
  
  // Pattern 3: "R' [Name]" or "R. [Name]"
  const pattern3 = /R['.\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
  const match3 = firstPart.match(pattern3);
  if (match3) return `Rabbi ${match3[1]}`;
  
  return null;
}
function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line) {
    // Match any letter prefix (Ad, Xx, Yy, etc.) followed by digits
    // Supports 1-2 letter prefixes: Ad1234, Xx0172, Y99, etc.
    let match = line.match(/\b([A-Za-z]{1,2}\d+)\b/i);
    if (match) return match[1];
    
    // Fallback: digits followed by letters (rare format)
    match = line.match(/(\d+[A-Za-z]{1,2})/i);
    if (match) {
        const numbers = match[1].replace(/[A-Za-z]/gi, '');
        const letters = match[1].replace(/\d/g, '');
        return `${letters}${numbers}`;
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
  
  // ✅ CRITICAL FIX: Initialize ALL fields to prevent sticky variable bug
  const storyData = {
    id: null,
    day: null,
    month: null,
    monthIndex: null,
    title_en: null,
    title_he: null,
    body: null,
    tags: [],
    rabbi_name_en: null,  // FIXED: Separate fields for EN and HE
    rabbi_name_he: null,
    koteret: null
  };
  
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
        
        // NEW: Rabbi Extraction (ENGLISH ONLY)
        const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:/i;
        if (regexRabbi.test(cleanLine)) {
            const rabbi = cleanLine.replace(regexRabbi, '').replace(/###/g, '').trim();
            storyData.rabbi_name_en = rabbi;  // FIXED: Store in rabbi_name_en
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
  let rabbi_name = null;
  
  // Remove the ID tag at the beginning
  content = content.replace(/#סיפור_מספר:\s*Ad\d+/i, '');
  
  // Remove ###NEW STORY to expose the rabbi name
  content = content.replace(/###NEW STORY/gi, '');
  
  // EXTRACT RABBI NAME using split approach
  // Format: ###KOTERET: title###rabbi_name###date_body...
  // OR:     ###rabbi_name###date_body...
  // The rabbi name segment contains " quotes which breaks regex ###([^#]+)### matching.
  // So we split by '###' and look for the first segment that is NOT a metadata tag.
  const segments = content.split('###').map(s => s.trim()).filter(s => s.length > 0);
  for (const seg of segments) {
    // Skip known metadata tags
    if (/^(KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|NEW STORY)/i.test(seg)) continue;
    if (/^English Translation/i.test(seg) || /^Hebrew Translation/i.test(seg)) continue;
    if (/^(Date|תאריך)/i.test(seg)) continue;
    // Skip exact "BIOGRAPHY" segment
    if (seg === 'BIOGRAPHY') continue;
    // Skip segments that are too long (likely body text, not a name)
    if (seg.length > 200) continue;
    // Skip segments that start with Hebrew date patterns (gematria letter + quote + space + month)
    // e.g. "כ"ט אדר", "י"א אדר", "א' ניסן"
    const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
    const datePattern = new RegExp(`^[א-ת]['"\'\"׳״][א-ת]?\\s+(${hebrewMonths})`);
    if (datePattern.test(seg)) continue;
    // Also skip simple date like "א' אדר" or "ה ניסן"
    const simpleDatePattern = new RegExp(`^[א-ת]['׳]\\s+(${hebrewMonths})`);
    if (simpleDatePattern.test(seg)) continue;
    // This should be the rabbi name
    rabbi_name = seg;
    break;
  }
  
  // EXTRACTION STEP: Extract ALL ###...### patterns as tags BEFORE removing them
  const tagPattern = /###([^#\n]+)###/g;
  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const tag = match[1].trim();
    // Skip ONLY known metadata patterns that are NOT actual tags
    if (tag && 
        tag !== 'NEW STORY' &&
        !tag.match(/^English Translation/i) &&
        !tag.match(/^Hebrew Translation/i) &&
        tag !== rabbi_name) { // Don't add rabbi name as a tag
      tags.push(tag);
    }
  }
  
  // CLEANING STEP: Remove ALL ### patterns completely
  // Strategy: Remove everything that starts with ### until we hit actual Hebrew content
  
  // Step 1: Remove closed patterns like ###BIOGRAPHY###
  content = content.replace(/###[^#]+###/g, '');
  
  // Step 2: Remove ###NEW STORY (already did above, but just in case)
  content = content.replace(/###NEW STORY/gi, '');
  
  // Step 3: Remove any remaining ### followed by any characters
  // This catches patterns like "###א' אדר" that are open-ended
  content = content.replace(/###[^\u05d0-\u05ea]*([א-ת'])/gu, '$1');
  
  // Step 4: Remove plain "NEW STORY" without ###
  content = content.replace(/NEW STORY/gi, '');
  // Step 5: Final cleanup - remove any stray ### that might remain
  content = content.replace(/###/g, '');
  
  // Step 6: Remove Hebrew date markers at the beginning (e.g., "א' אדר", "י"א אדר", "כ"ח כסלו")
  // CRITICAL: Hebrew day numbers use gematria with EMBEDDED quotes (not at the end)
  // Format: [letter(s)] + [quote] + [optional letter(s)] + [space] + [month name]
  // Examples: א' (1), י"א (11), כ"ח (28)
  // Trim first to ensure pattern starts at the beginning
  content = content.trim();
  const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
  const dateMarkerPattern = new RegExp(`^[א-ת]+['\"׳״][א-ת]*\\s*(${hebrewMonths})`, 'i');
        content = content.replace(dateMarkerPattern, '');
    
  // Clean up multiple spaces and trim again
  const body = content.replace(/\s+/g, ' ').trim();
  
  return {
    id: story.id,
    body: body,
    tags: tags,
    rabbi_name: rabbi_name  // NEW: Include rabbi name
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

  // Support Hebrew-only files (English is now optional)
  const textEn = files.pathEn ? await getFileContent(files.pathEn) : null;
  const textHe = await getFileContent(files.pathHe);

  if (!textHe) {
    console.error('❌ Hebrew file is required');
    return;
  }

  // Process English (standard split) - only if English file exists
  const splitRegex = /^(?:###\s*)?NEW\s*STORY/im;
  const rawStoriesEn = textEn ? textEn.split(splitRegex) : [];

  // Process Hebrew (special split by ID tag)
  const rawStoriesHe = splitHebrewStories(textHe);

  console.log(`📊 Processing: EN (${rawStoriesEn.length}) | HE (${rawStoriesHe.length})`);

  const storiesMap = new Map();

  // Process English first (if exists)
  if (textEn) {
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
        rabbi_name_en: data.rabbi_name_en || null,  // FIXED: From English ###Rabbi:
        rabbi_name_he: null,                         // FIXED: Will be filled from Hebrew
        tags: data.tags || []  // NEW: Include English tags
      });
    }
  });
  } // End if (textEn)

  // NEW: If no English, create entries from Hebrew
  if (!textEn) {
    console.log('📝 Creating entries from Hebrew-only files...');
    rawStoriesHe.forEach(heStory => {
      const parsed = parseHebrewStory(heStory);
      
      if (parsed.id) {
        const isTitleTag = parsed.rabbi_name && /^(KOTERET|BIOGRAPHY|Hebrew Title|Title)/i.test(parsed.rabbi_name);
        
        storiesMap.set(parsed.id, {
          external_id: parsed.id,
          hebrew_day: parsed.day || 1,
          hebrew_month: parsed.month || 'Adar',
          hebrew_month_index: parsed.monthIndex || 12,
          title_en: null,
          body_en: null,
          title_he: isTitleTag 
            ? parsed.rabbi_name.replace(/^(KOTERET|BIOGRAPHY|Hebrew Title|Title):\s*/i, '').trim()
            : (parsed.title_he || null),
          body_he: parsed.body || null,
          rabbi_name_en: null,
          rabbi_name_he: isTitleTag ? null : (parsed.rabbi_name || null),
          tags: parsed.tags || []
        });
      }
    });
  }

  // Process Hebrew - Merge by ID (only if English exists)
  let mergedCount = 0;
  if (textEn) {
  rawStoriesHe.forEach(heStory => {
    const parsed = parseHebrewStory(heStory);
    
    if (parsed.id && storiesMap.has(parsed.id)) {
      const existing = storiesMap.get(parsed.id);
      if (parsed.body && parsed.body.length > 10) {
        existing.body_he = parsed.body;
        
        // CRITICAL FIX: Only assign to rabbi_he if it's NOT a title tag (KOTERET, BIOGRAPHY, etc.)
        if (parsed.rabbi_name) {
          const isTitleTag = /^(KOTERET|BIOGRAPHY|Hebrew Title|Title)/i.test(parsed.rabbi_name);
          
          if (isTitleTag) {
            // This is a title, not a rabbi name
            existing.title_he = parsed.rabbi_name.replace(/^(KOTERET|BIOGRAPHY|Hebrew Title|Title):\s*/i, '').trim();
          } else {
            // This is actually a rabbi name (HEBREW)
            existing.rabbi_name_he = parsed.rabbi_name;  // FIXED: Store in rabbi_name_he
            
            // Fallback: if no title_he yet, use rabbi name as title
            if (!existing.title_he) {
              existing.title_he = parsed.rabbi_name;
            }
          }
        }
        
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
  } // End if (textEn)

  const finalArray = Array.from(storiesMap.values());
  
  if (textEn) {
    console.log(`\n🔄 Merged ${mergedCount} Hebrew bodies`);
  } else {
    console.log(`\n✅ Created ${finalArray.length} Hebrew-only stories`);
  }
  
  // Transform to new schema structure & Generate Embeddings
  let processedData = [];
  for (let i = 0; i < finalArray.length; i++) {
      const story = finalArray[i];
      
      // FIXED: Use the separate EN and HE rabbi name fields
      const rabbi_en = story.rabbi_name_en || null;
      const rabbi_he = story.rabbi_name_he || null;
      
      // Format dates
      const date_he = formatHebrewDate(story.hebrew_day, story.hebrew_month);
      const date_en = formatEnglishDate(story.hebrew_day, story.hebrew_month);
      
      const textForAI = story.body_he || story.body_en;
      const embedding = await generateEmbedding(textForAI);
      
      // NEW SCHEMA: 10 exact columns as client specified
      processedData.push({
          story_id: story.external_id,           // Column 1: Story #
          rabbi_he: rabbi_he,                    // Column 2: Rabbi Name Hebrew
          rabbi_en: rabbi_en,                    // Column 3: Rabbi Name English
          date_he: date_he,                      // Column 4: Date Hebrew (e.g., "א' אדר")
          date_en: date_en,                      // Column 5: Date English (e.g., "1 Adar")
          title_he: story.title_he || null,      // Column 6: Title Hebrew
          title_en: story.title_en || null,      // Column 7: Title English
          body_he: story.body_he || null,        // Column 8: Story Content Hebrew
          body_en: story.body_en || null,        // Column 9: Story Content English
          tags: [...new Set(story.tags)],        // Column 10: Tags (array, deduplicated)
          embedding: embedding,                  // Keep for AI, but may not upload
          is_published: true                     // Keep for DB
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