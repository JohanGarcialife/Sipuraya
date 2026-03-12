import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import mammoth from "mammoth";
import pdf from "pdf-parse"; // Revert to default import matching zipper.js behavior

// CONFIGURATION
export const runtime = 'nodejs'; // Required for FormData handling
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Increase to 300s (5 mins) for Pro, will be capped at 60s for Hobby




const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

const MONTH_MAP: Record<string, number> = {
  'nisan': 1, 'iyar': 2, 'sivan': 3, 'tamuz': 4, 'av': 5, 'elul': 6,
  'tishrei': 7, 'cheshvan': 8, 'kislev': 9, 'tevet': 10, 'shevat': 11,
  'adar': 12, 'adar i': 12, 'adar ii': 13, 'adar 1': 12, 'adar 2': 13
};

// Hebrew month names for date formatting
const HEBREW_MONTH_NAMES: Record<string, string> = {
  'Nisan': 'ניסן', 'Nissan': 'ניסן', 'Iyar': 'אייר', 'Sivan': 'סיון',
  'Tamuz': 'תמוז', 'Tammuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
  'Tishrei': 'תשרי', 'Cheshvan': 'חשון', 'Kislev': 'כסלו',
  'Tevet': 'טבת', 'Shevat': 'שבט', 'Adar': 'אדר',
  'Adar I': 'אדר א', 'Adar II': 'אדר ב'
};

// Hebrew day numbers in gematria format
const HEBREW_DAY_NUMBERS: Record<number, string> = {
  1: "א'", 2: "ב'", 3: "ג'", 4: "ד'", 5: "ה'",
  6: "ו'", 7: "ז'", 8: "ח'", 9: "ט'", 10: "י'",
  11: 'י"א', 12: 'י"ב', 13: 'י"ג', 14: 'י"ד', 15: 'ט"ו',
  16: 'ט"ז', 17: 'י"ז', 18: 'י"ח', 19: 'י"ט', 20: "כ'",
  21: 'כ"א', 22: 'כ"ב', 23: 'כ"ג', 24: 'כ"ד', 25: 'כ"ה',
  26: 'כ"ו', 27: 'כ"ז', 28: 'כ"ח', 29: 'כ"ט', 30: "ל'"
};

// Reverse map for parsing Hebrew dates (Gematria -> Number)
const GEMATRIA_MAP: Record<string, number> = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
  "יא": 11, "יב": 12, "יג": 13, "יד": 14, "טו": 15, "טז": 16, "יז": 17, "יח": 18, "יט": 19, "כ": 20,
  "כא": 21, "כב": 22, "כג": 23, "כד": 24, "כה": 25, "כו": 26, "כז": 27, "כח": 28, "כט": 29, "ל": 30
};

// Format Hebrew date: "א' אדר"
function formatHebrewDate(day: number, monthEnglish: string): string {
  const hebrewDay = HEBREW_DAY_NUMBERS[day] || day.toString();
  const hebrewMonth = HEBREW_MONTH_NAMES[monthEnglish] || monthEnglish;
  return `${hebrewDay} ${hebrewMonth}`;
}

// Format English date: "1 Adar"  
function formatEnglishDate(day: number, monthEnglish: string): string {
  return `${day} ${monthEnglish}`;
}

function cleanId(id: string) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line: string) {
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

// Regex to fix detached Hebrew Nikkud (Combining Diacritics)
// If there is a space before a Nikkud, it detaches from the letter.
// We remove the space so it attaches to the previous letter.
// Range: \u0591-\u05C7 (Cantillation & Vowels)
function repairHebrewText(text: string) {
    if (!text) return text;
    // Normalize unicode first (NFC)
    let repaired = text.normalize('NFC');
    
    // Remove space (including non-breaking) between any character and a Hebrew vowel/mark
    repaired = repaired.replace(/[\s\u00A0]+([\u0591-\u05C7])/g, '$1');
    
    // Remove the "dotted circle" placeholder if present (U+25CC)
    repaired = repaired.replace(/\u25CC/g, '');

    // Remove Left-to-Right and Right-to-Left marks that might confuse rendering
    // U+200E (LTR), U+200F (RTL), U+202A-U+202E (Embedding/Override), U+00AD (Soft Hyphen)
    // Also removing Zero Width Space (U+200B) and Zero Width No-Break Space (U+FEFF)
    repaired = repaired.replace(/[\u200E\u200F\u202A-\u202E\u00AD\u200B\uFEFF]/g, '');
    
    return repaired;
}

// Helper: Check if text contains Hebrew characters
function hasHebrewCharacters(text: string | null): boolean {
  if (!text) return false;
  // Hebrew Unicode range: U+0590 to U+05FF
  return /[\u0590-\u05FF]/.test(text);
}

// Extract English rabbi name from story content
function extractEnglishRabbiName(englishBody: string | null) {
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

async function extractText(buffer: Buffer, fileType: string) {
  try {
    console.log(`[ExtractText] Starting for fileType: ${fileType}, Buffer size: ${buffer.length}`);
    if (fileType.toLowerCase().endsWith(".pdf") || fileType === "application/pdf") {
      const data = await pdf(buffer);
      console.log(`[ExtractText] PDF parsed. Text length: ${data.text.length}`);
      return data.text.replace(/\n\n+/g, '\n');
    } else {
      const result = await mammoth.extractRawText({ buffer: buffer });
      console.log(`[ExtractText] DOCX parsed. Text length: ${result.value.length}`);
      return result.value;
    }
  } catch (e: any) {
    console.error(`[ExtractText] Error extracting text from ${fileType}:`, e.message);
    return "";
  }
}

function parseStoryBlock(block: string) {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  
  // ✅ CRITICAL FIX: Initialize ALL fields to prevent sticky variable bug
  // Each story gets a FRESH object - no data leaks between stories
  const storyData: any = {
    id: null,
    day: null,
    month: null,
    monthIndex: null,
    title_en: null,
    title_he: null,
    body: null,
    tags: [],           // Always start with empty array
    rabbi_name: null,   // NEW field
    series: null,       // NEW field
    koteret: null       // Temp field for ###KOTERET extraction
  };
  
  let bodyBuffer: string[] = [];
  let tagsBuffer: string[] = [];

    const regexDate = /###Date:|###תאריך:|Date:|תאריך:/i;
    const regexTitleEn = /###English Title:|English Title:|Title:/i;
    const regexTitleHe = /###KOTERET:|###Hebrew Title:|KOTERET:|Hebrew Title:/i;
    // NEW: Series / Netflix Title Regex
    const regexSeries = /###Series:|###Netflix Title:|###Series Title:|Series:|Netflix Title:/i;

    // Simplified: Only ignore these EXACT patterns (using regex for precise matching)
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
  
      if (cleanLine.includes('Story ID') || /([A-Za-z]{2}\d+)/.test(cleanLine)) {
          const foundId = smartFindId(cleanLine);
          if (foundId) {
              storyData.id = cleanId(foundId);
              return; 
          }
      }
  
      if (cleanLine.includes('###') || regexDate.test(cleanLine) || regexSeries.test(cleanLine)) {
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
                  // Fix: Handle "1 of Adar" format - take the word AFTER "of"
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
              const heTitle = cleanLine.replace(regexTitleHe, '').replace(/###/g, '').trim();
              storyData.title_he = heTitle;
              storyData.koteret = heTitle;  // Also save as koteret
              return;
          }

          // NEW: Series Extraction
          if (regexSeries.test(cleanLine)) {
              const series = cleanLine.replace(regexSeries, '').replace(/###/g, '').trim();
              console.log(`[Ingest] 📺 Found Series: "${series}"`);
              storyData.series = series;
              return;
          }
  
          // NEW: Rabbi Extraction (ENGLISH ONLY - no Hebrew patterns)
          const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:/i;
          if (regexRabbi.test(cleanLine)) {
              const rabbi = cleanLine.replace(regexRabbi, '').replace(/###/g, '').trim();
              console.log(`[Ingest] 🧩 parseStoryBlock found Rabbi line: "${cleanLine}" -> Extracted: "${rabbi}"`);
              storyData.rabbi_name = rabbi;
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
            !regexSeries.test(cleanLine) && // Don't add series as a tag
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
    
    // Also skip plain "NEW STORY" without ###
    if (cleanLine === 'NEW STORY' || cleanLine.includes('NEW STORY')) return;
    
    // Body Content: Skip only explicit ignore patterns, everything else goes to body
    if (IGNORE_PATTERNS.some(pattern => pattern.test(cleanLine))) return;
    
    // Skip ONLY standalone page numbers (single digits or simple numbers on their own line)
    // But allow numbers that are part of text (like "10 people" or "Ad123")
    if (/^\d+$/.test(cleanLine) && cleanLine.length <= 3) return; 
    bodyBuffer.push(cleanLine);
  });

  storyData.body = bodyBuffer.join('\n').trim();
  storyData.tags = tagsBuffer; // NEW: Include extracted tags
  return storyData;
}

// --- SPECIAL SPLIT FOR HEBREW FILES (Ported from zipper.js) ---
function splitHebrewStories(text: string) {
  const stories: any[] = [];
  
  // Split by the Hebrew ID tag pattern (Generalized for Ad, Ni, Xx, etc.)
  const regex = /#סיפור_מספר:\s*([A-Za-z]{1,2}\d+)/gi;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      id: match[1],
      position: match.index,
      fullMatch: match[0]
    });
  }
  
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
function parseHebrewStory(story: any) {
  const rawContent = story.content;
  const tags: string[] = [];
  let rabbi_name: string | null = null;
  let parsedDay = 1;
  let parsedMonth = 'Adar';
  let dateFound = false;
  const bodyLines: string[] = [];

  const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
  const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

  // Helper: is this a metadata/system line that should NOT appear in the body?
  function isMetaLine(line: string): boolean {
    const t = line.trim();
    // Any line starting with # (covers #סיפור_מספר, ###KOTERET, ###TAG###, etc.)
    if (t.startsWith('#')) return true;
    // Bare keyword lines
    if (/^(NEW STORY|KOTERET|BIOGRAPHY|English Translation|Hebrew Translation)/i.test(t)) return true;
    return false;
  }

  // Process line by line
  const lines = rawContent.split('\n');
  for (const rawLine of lines) {
    const t = rawLine.trim();

    if (isMetaLine(t)) {
      // Extract any inline tags (###TAG###) that may be embedded in the metadata line
      const inlineTagPattern = /###([^#\n]{1,60})###/g;
      let m;
      while ((m = inlineTagPattern.exec(t)) !== null) {
        const tag = m[1].trim();
        if (tag && tag !== 'NEW STORY' && !/^(KOTERET|BIOGRAPHY|English|Hebrew)/i.test(tag)) {
          tags.push(tag);
        }
      }
      // Skip this line entirely — it must not go into body
      continue;
    }

    // Skip blank lines at the very beginning (before any body content)
    if (!t && bodyLines.every(l => l.trim() === '')) {
      continue;
    }

    // --- Date Detection ---
    if (!dateFound && dateMarkerPattern.test(t)) {
      const dateMatch = t.match(dateMarkerPattern);
      if (dateMatch) {
        const dayStr = dateMatch[1].replace(/['"׳״]/g, '');
        const monthStr = dateMatch[2];
        if (GEMATRIA_MAP[dayStr]) parsedDay = GEMATRIA_MAP[dayStr];
        for (const [eng, heb] of Object.entries(HEBREW_MONTH_NAMES)) {
          if (heb === monthStr || monthStr.includes(heb)) {
            parsedMonth = eng;
            break;
          }
        }
        dateFound = true;
        console.log(`[Ingest] \u{1F4C5} Extracted Hebrew date: ${dayStr} (${parsedDay}) ${monthStr} -> ${parsedMonth}`);
        // Remove the date from this line, keep any trailing text
        const remainder = t.replace(dateMarkerPattern, '').trim();
        if (remainder.length > 0) bodyLines.push(remainder);
        continue;
      }
    }

    // --- Rabbi Name Detection (short line before substantial body content) ---
    if (!rabbi_name) {
      const bodyText = bodyLines.filter(l => l.trim().length > 0).join(' ');
      const isEarlyInContent = bodyText.length < 150;
      const isShortLine = t.length > 0 && t.length < 100;
      const hasHebrew = /[\u05d0-\u05ea]/.test(t);
      if (isEarlyInContent && isShortLine && hasHebrew && !dateMarkerPattern.test(t)) {
        rabbi_name = t;
        // Rabbi is tracked as metadata; do NOT add to body
        continue;
      }
    }

    // Regular body line
    bodyLines.push(t);
  }

  // Build final body preserving paragraph structure
  const body = bodyLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Extract day/month from story ID
  let day = parsedDay;
  let month = parsedMonth;
  if (story.id) {
    const idMatch = story.id.match(/([A-Za-z]+)(\d+)/);
    if (idMatch) {
      const monthCode = idMatch[1];
      const dayNum = parseInt(idMatch[2], 10);
      const monthMap: {[key: string]: string} = {
        'Ad': 'Adar', 'Ni': 'Nissan', 'Iy': 'Iyar', 'Si': 'Sivan',
        'Ta': 'Tammuz', 'Av': 'Av', 'El': 'Elul', 'Ti': 'Tishrei',
        'Ch': 'Cheshvan', 'Ki': 'Kislev', 'Te': 'Tevet', 'Sh': 'Shevat'
      };
      // Month from ID prefix is more reliable
      month = monthMap[monthCode] || parsedMonth;
      // Day: prefer dateFound (from body) over ID serial number
      if (!dateFound) day = dayNum;
    }
  }

  return {
    id: story.id,
    body: repairHebrewText(body),
    tags: tags,
    rabbi_name: rabbi_name,
    day: day,
    month: month,
    title_he: rabbi_name
  };
}


async function generateEmbedding(text: string) {
  if (!text || text.length < 5) return null;
  try {
    const cleanText = text.replace(/\s+/g, ' ').slice(0, 4000); 
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (e: any) {
    if (e.code === 'context_length_exceeded') {
        try {
            const shorterText = text.slice(0, 1000);
            const retryResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: shorterText,
                dimensions: 1536
            });
            return retryResponse.data[0].embedding;
        } catch(re) { return null; }
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

    // Read FormData containing files
    const formData = await req.formData();
    console.log("🔵 API INGEST: FormData received");
    
    const fileEn = formData.get("fileEn") as File | null;
    const fileHe = formData.get("fileHe") as File | null;

    if (!fileHe) {
        return NextResponse.json({ error: "Hebrew file is required" }, { status: 400 });
    }

    console.log(`📥 Processing files: EN=${fileEn?.name || "(none)"}, HE=${fileHe.name}`);
    
    // Convert File to Buffer
    const bufferEn = fileEn ? Buffer.from(await fileEn.arrayBuffer()) : null;
    const bufferHe = Buffer.from(await fileHe.arrayBuffer());

    const textEn = fileEn && bufferEn ? await extractText(bufferEn, fileEn.name) : "";
    const textHe = await extractText(bufferHe, fileHe.name);

    if (textEn) {
      console.log(`[Ingest] TEXT PREVIEW EN: ${textEn.substring(0, 200)}`);
    }
    console.log(`[Ingest] TEXT PREVIEW HE: ${textHe.substring(0, 200)}`);

    const splitRegex = /^(?:###\s*)?NEW\s*STORY/im;
    const rawStoriesEn = textEn ? textEn.split(splitRegex) : [];
    
    // Process Hebrew (special split by ID tag logic from zipper.js)
    const rawStoriesHe = splitHebrewStories(textHe);

    console.log(`[Ingest] Split Counts - EN: ${rawStoriesEn.length}, HE: ${rawStoriesHe.length}`);

    const storiesMap = new Map();

    // Process English first (if exists)
    if (rawStoriesEn.length > 0) {
      let skippedEnStories = 0;
      rawStoriesEn.forEach((block, index) => {
      const data = parseStoryBlock(block);
      
      // ENHANCED DEBUG: Track stories without IDs
      if (!data.id) {
          skippedEnStories++;
          // Log first few failures and any in the Ad1289-Ad1409 range
          if (index < 3 || (block.includes('Ad1') && (block.includes('1289') || block.includes('1300') || block.includes('1324')))) {
            console.log(`[Ingest] ⚠️ Story #${index} has NO ID - SKIPPED`);
            console.log(`[Ingest] First 5 lines:\n${block.split('\n').slice(0, 5).join('\n')}`);
          }
          return; // Skip this story
      }
      
      if (data.id) {
        const day = data.day || 1;
        const month = data.month || 'Adar';
        
        // DEBUG: Trace Rabbi Extraction
        if (data.rabbi_name) {
            console.log(`[Ingest] 🔍 ID: ${data.id} extracted Rabbi (EN parser): "${data.rabbi_name}"`);
        }

        storiesMap.set(data.id, {
          story_id: data.id,                                    
          date_he: formatHebrewDate(day, month),               
          date_en: formatEnglishDate(day, month),              
          rabbi_he: null,                                      
          rabbi_en: data.rabbi_name,                          // REVERT: Back to direct assignment for debugging
          series: data.series || null,                        // NEW field
          title_en: data.title_en,
          title_he: data.title_he || null,
          body_en: data.body,
          body_he: null,
          tags: data.tags || [],                               
        });
      }
    });
    }

    console.log(`[Ingest] English stories mapped: ${storiesMap.size}`);

    // NEW: If no English stories, create entries from Hebrew
    if (storiesMap.size === 0) {
      console.log('[Ingest] No English stories - creating from Hebrew-only...');
      let skippedHeOnlyStories = 0;
      rawStoriesHe.forEach(heStory => {
        const data = parseHebrewStory(heStory);
        
        if (!data.id) {
          skippedHeOnlyStories++;
          return;
        }
        
        if (data.id) {
          const day = data.day || 1;
          const month = data.month || 'Adar';
          const isTitleTag = data.rabbi_name && /^(KOTERET|BIOGRAPHY|Hebrew Title|Title)/i.test(data.rabbi_name);
          
          storiesMap.set(data.id, {
            story_id: data.id,
            date_he: formatHebrewDate(day, month),
            date_en: formatEnglishDate(day, month),
            rabbi_he: isTitleTag ? null : (data.rabbi_name || null),
            rabbi_en: null,
            title_en: null,
            title_he: isTitleTag 
              ? (data.rabbi_name?.replace(/^(KOTERET|BIOGRAPHY|Hebrew Title|Title):\s*/i, '').trim() || null)
              : (data.title_he || null),
            body_en: null,
            body_he: data.body || null,
            tags: data.tags || []
          });
        }
      });
      if (skippedHeOnlyStories > 0) {
        console.log(`[Ingest] ⚠️ Skipped ${skippedHeOnlyStories} Hebrew-only stories due to missing IDs`);
      }
    }

    // Process Hebrew - Merge with English (only if English stories exist)
    let matchCount = 0;
    if (storiesMap.size > 0 && rawStoriesEn.length > 0) {
      rawStoriesHe.forEach(heStory => {
      // Use specialized Hebrew parser
      const data = parseHebrewStory(heStory);
      if (data.id && storiesMap.has(data.id)) {
        const existing = storiesMap.get(data.id);
        
        // Update fields if present
        if (data.body && data.body.length > 2) existing.body_he = data.body;
        
        // CRITICAL FIX: Only assign to rabbi_he if it's NOT a title tag (KOTERET, BIOGRAPHY, etc.)
        if (data.rabbi_name) {
          const isTitleTag = /^(KOTERET|BIOGRAPHY|Hebrew Title|Title)/i.test(data.rabbi_name);
          
          if (isTitleTag) {
            // This is a title, not a rabbi name
            existing.title_he = data.rabbi_name.replace(/^(KOTERET|BIOGRAPHY|Hebrew Title|Title):\s*/i, '').trim();
          } else {
            // This is actually a rabbi name
            existing.rabbi_he = data.rabbi_name;
            
            // Fallback: if no title_he yet, use rabbi name as title
            if (!existing.title_he) {
              existing.title_he = data.rabbi_name;
            }
          }
        }

        if (data.tags && data.tags.length > 0) {
          existing.tags = Array.from(new Set([...existing.tags, ...data.tags]));
        }
        matchCount++;
      }
    });
    }

    if (rawStoriesEn.length > 0) {
      console.log(`[Ingest] Merged HE stories. Match Count: ${matchCount}`);
    } else {
      console.log(`[Ingest] Created ${storiesMap.size} Hebrew-only stories`);
    }
    
    // Populate English Rabbi Names (Post-process fallback)
    for (const [id, story] of storiesMap.entries()) {
        if (!story.rabbi_en) {
            story.rabbi_en = extractEnglishRabbiName(story.body_en);
        }
    }


    const finalArray = Array.from(storiesMap.values());
    let processedCount = 0;
    
    // OPTIMIZATION: Process in parallel chunks to avoid timeouts
    // Verify embedding generation is skipped if text is null
    const CONCURRENCY_LIMIT = 5;
    
// Helper to remove Nikkud for better search matching
function removeNikkud(text: string): string {
  return text ? text.replace(/[\u0591-\u05C7]/g, "") : "";
}

    for (let i = 0; i < finalArray.length; i += CONCURRENCY_LIMIT) {
        const chunk = finalArray.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (story) => {
             // @ts-ignore
             // IMPROVED CONTEXT: Include Titles (Plain + No-Nikkud), Rabbi, Series, and Body
             const cleanTitleHe = story.title_he ? removeNikkud(story.title_he) : "";
             const cleanBodyHe = story.body_he ? removeNikkud(story.body_he) : "";
             
             const textForAI = `
Title: ${story.title_en || ""} ${story.title_he || ""}
Clean Title: ${cleanTitleHe}
Rabbi: ${story.rabbi_en || ""} ${story.rabbi_he || ""}
Series: ${story.series || ""}
Body: ${story.body_en || ""} ${story.body_he || ""}
Clean Body Search: ${cleanBodyHe}
`.trim();
             
             // Ensure story has an ID before upserting
             if (!story.story_id) return;

             try {
                console.log(`[Ingest] Generating embedding for ID: ${story.story_id}`);
                const embedding = await generateEmbedding(textForAI);
                
                // Build upsert payload SELECTIVELY to avoid overwriting good data with nulls
                const upsertPayload: any = {
                    story_id: story.story_id,
                    embedding,
                    is_published: true
                };
                
                // Only include fields that have valid non-null values
                if (story.date_he) upsertPayload.date_he = story.date_he;
                if (story.date_en) upsertPayload.date_en = story.date_en;
                if (story.title_en) upsertPayload.title_en = story.title_en;
                if (story.title_he) upsertPayload.title_he = story.title_he;
                if (story.body_en) upsertPayload.body_en = story.body_en;
                if (story.body_he) upsertPayload.body_he = story.body_he;
                // CRITICAL FIX: Always include rabbi fields (even if null) to overwrite corrupt data
                // This ensures Hebrew text in rabbi_en gets replaced with correct English or null
                upsertPayload.rabbi_en = story.rabbi_en;
                upsertPayload.rabbi_he = story.rabbi_he;
                if (story.series) upsertPayload.series = story.series; // NEW
                if (story.tags && story.tags.length > 0) upsertPayload.tags = story.tags;
                
                // DEBUG: Log specific Payload for Upsert (Check for contamination)
                if (story.story_id === 'Ni0057' || story.story_id === 'Ni0033' || i === 0) {
                    console.log(`[Ingest] 🛠️ UPSERT PAYLOAD for ${story.story_id}:`, {
                        rabbi_en: upsertPayload.rabbi_en,
                        rabbi_he: upsertPayload.rabbi_he,
                        title_en: upsertPayload.title_en
                    });
                }

                const { error } = await supabase.from('stories').upsert(upsertPayload, { onConflict: 'story_id' });

                if (!error) processedCount++;
                else console.error(`[Ingest] DB Error for ${story.story_id}:`, error.message);
             } catch (err: any) {
                 console.error(`[Ingest] Processing Error for ${story.story_id}:`, err.message);
             }
        }));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processedCount} stories. Matches: ${matchCount}`,
      debug: {
        storiesEnFound: rawStoriesEn.length,
        storiesHeFound: rawStoriesHe.length,
        sampleTextEn: textEn.substring(0, 500),
        sampleTextHe: textHe.substring(0, 500)
      }
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}