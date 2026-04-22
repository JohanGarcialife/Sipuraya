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

function cleanId(id: string | null) {
  if (!id) return null;
  // Handle case like "Ni0044" -> "Ni44" or "ly0074" -> "Iy74"
  const match = id.match(/([A-Za-z]+)(\d+)/);
  if (!match) return id.trim().toUpperCase();

  let prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  
  // Normalize common typos (English file often uses lowercase L 'ly' instead of capital I 'Iy')
  if (prefix === 'Ly') prefix = 'Iy';

  const num = parseInt(match[2], 10);
  return `${prefix}${num}`;
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
    } else if (fileType.toLowerCase().endsWith(".docx") || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Use convertToHtml instead of extractRawText to preserve soft line breaks (Shift+Enter / <w:br/>)
      const result = await mammoth.convertToHtml({ buffer });
      
      // Manually convert HTML paragraph and break tags to text newlines
      let text = result.value
        .replace(/<\/p>/g, '\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<\/?[^>]+(>|$)/g, ""); // strip any remaining headers, bold, italics, etc
        
      // Unescape common HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      console.log(`[ExtractText] DOCX parsed. Text length: ${text.length}`);
      return text;
    } else {
      const result = await mammoth.extractRawText({ buffer: buffer });
      console.log(`[ExtractText] Other file type parsed. Text length: ${result.value.length}`);
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

          // CRITICAL FIX: Extract inline body from ###English Translation: tag
          // Format: "###English Translation: My master, father..." — the story text is on the same line
          const regexBodyEn = /^###English Translation:/i;
          if (regexBodyEn.test(cleanLine)) {
              const bodyContent = cleanLine.replace(regexBodyEn, '').trim();
              if (bodyContent && bodyContent.length > 0) {
                  bodyBuffer.push(bodyContent);
              }
              return;
          }

          // Skip ###Sources Tag: lines (metadata, not body)
          if (/^###Sources Tag:/i.test(cleanLine)) return;

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
  let title_he: string | null = null;
  let parsedDay = 1;
  let parsedMonth = 'Adar';
  let dateFound = false;
  const bodyLines: string[] = [];

  const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
  const dateMarkerPattern = new RegExp(`^([א-ת]+['"׳״]?[א-ת]*)\\s*(${hebrewMonths})`, 'i');

  const rawLines = rawContent.split('\n');

  // --- 1. EXTRACT KOTERET (TITLE) AND RABBI NAME FIRST ---
  // Pass 0: Extract KOTERET
  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    const match = t.match(/^(?:###)?\s*(?:KOTERET|Hebrew Title|Title):\s*(.+)/i);
    if (match) {
      title_he = match[1].replace(/^###|###$/g, '').trim();
      console.log(`[Ingest] 🏷️ Found Hebrew Title (KOTERET): "${title_he}"`);
      break;
    }
  }

  // Pass 1: Look for explicit "###<HebrewName>" lines that aren't system keywords.
  // Format in the Adar files: ###NEW STORY / ###רבי אברהם אבן עזרא / ###א' אדר / BIOGRAPHY###
  for (const rawLine of rawLines) {
    const t = rawLine.trim();
    // Must start with ### to be an explicit tag
    if (!t.startsWith('###')) continue;
    // Strip the ### prefix and any trailing ###
    const inner = t.replace(/^###|###$/g, '').trim();
    // Skip known system keywords
    if (!inner || /^(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(inner)) continue;
    // Skip ID lines
    if (inner.includes('סיפור_מספר')) continue;
    // Skip if too long to be a name
    if (inner.length > 100) continue;
    // Skip Hebrew dates (e.g. א' אדר)
    const datePat = new RegExp(`^[א-ת]['"׳״]?[א-ת]*\\s+(${hebrewMonths})`, 'i');
    if (datePat.test(inner)) continue;
    // Must contain Hebrew characters to be a name
    if (/[\u05d0-\u05ea]/.test(inner)) {
      rabbi_name = inner;
      console.log(`[Ingest] ✡️ Found Rabbi name via ### tag: "${rabbi_name}"`);
      break;
    }
  }

  // Pass 2 (Fallback): Client format changed in Nissan files — Rabbi name is on "line 3" without ### tags.
  // It usually looks like:
  // #סיפור_מספר: Ni0001
  // NEW STORY
  // הגאון רבי שמואל הלוי קעלין זי"ע - בעל מחצית השקל
  if (!rabbi_name) {
    let nonMetaLineCount = 0;
    for (const rawLine of rawLines) {
      const t = rawLine.trim();
      if (!t) continue;
      
      // Skip ID lines and system tags
      if (t.includes('סיפור_מספר') || /^(###)?(NEW STORY|KOTERET|BIOGRAPHY|English Title|Hebrew Title|Title|English Translation|Hebrew Translation)/i.test(t)) {
        continue;
      }

      // Check if it's the date line
      const cleanT = t.replace(/^###|###$/g, '').trim();
      const datePat = new RegExp(`^[א-ת]['"׳״]?[א-ת]*\\s+(${hebrewMonths})`, 'i');
      if (datePat.test(cleanT)) continue;

      // This is the first "content" line
      nonMetaLineCount++;
      
      if (nonMetaLineCount === 1) {
        // If it's relatively short, it's very likely the Rabbi Name / Title
        if (cleanT.length > 3 && cleanT.length < 120 && /[\u05d0-\u05ea]/.test(cleanT)) {
          rabbi_name = cleanT;
          console.log(`[Ingest] ✡️ Found Rabbi name via Line-3 fallback: "${rabbi_name}"`);
        }
        break; // Stop looking after the first content line
      }
    }
  }


  // Helper: is this a metadata/system line that should NOT appear in the body?
  function isMetaLine(line: string): boolean {
    const t = line.trim();
    // Any line starting with # (covers #סיפור_מספר, ###KOTERET, ###TAG###, etc.)
    if (t.startsWith('#')) return true;
    // Bare keyword lines
    if (/^(NEW STORY|KOTERET|BIOGRAPHY|English Translation|Hebrew Translation)/i.test(t)) return true;
    return false;
  }

  // Process line by line for body and remaining data
  const lines = rawContent.split('\n');
  for (const rawLine of lines) {
    const t = rawLine.trim();

    if (isMetaLine(t)) {
      // Extract any inline tags (###TAG###) that may be embedded in the metadata line
      const inlineTagPattern = /###([^#\n]{1,60})###/g;
      let m;
      while ((m = inlineTagPattern.exec(t)) !== null) {
        const tag = m[1].trim();
        if (tag && tag !== 'NEW STORY' && !/^(KOTERET|BIOGRAPHY|English|Hebrew)/i.test(tag) && tag !== rabbi_name) {
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

    // --- Skip Rabbi Name Line (if extracted via fallback) ---
    // If this line exactly matches the rabbi name we just extracted, skip adding it to the body
    const cleanT = t.replace(/^###|###$/g, '').trim();
    if (rabbi_name && cleanT === rabbi_name) {
      continue;
    }

    // --- Date Detection ---
    // Clean line for regex testing (remove optional ###)
    const normalizedLine = t.replace(/^###|###$/g, '').trim();

    if (!dateFound && dateMarkerPattern.test(normalizedLine)) {
      const dateMatch = normalizedLine.match(dateMarkerPattern);
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
        console.log(`[Ingest] 📅 Extracted Hebrew date: ${dayStr} (${parsedDay}) ${monthStr} -> ${parsedMonth}`);
        
        // No need to push to bodyLines as it was identified as metadata
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
    title_he: title_he || rabbi_name
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
    const rawStoriesEn = textEn ? textEn.split(splitRegex).filter(s => s.trim().length > 10) : [];
    
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
      if (!data.id) return; // Skip if no ID

      const isTitleTag = data.rabbi_name && /^(KOTERET|BIOGRAPHY|Hebrew Title|Title)/i.test(data.rabbi_name);

      if (storiesMap.has(data.id)) {
        // ✅ MATCHED — merge Hebrew data into existing English story
        const existing = storiesMap.get(data.id);
        
        // Update fields if present
        if (data.body && data.body.length > 2) existing.body_he = data.body;
        
        // Always prefer the explicit KOTERET title_he over rabbi_name
        if (data.title_he) {
          existing.title_he = data.title_he;
        }
        if (data.rabbi_name && !isTitleTag) {
          existing.rabbi_he = data.rabbi_name;
        }

        if (data.tags && data.tags.length > 0) {
          existing.tags = Array.from(new Set([...existing.tags, ...data.tags]));
        }
        matchCount++;
      } else {
        // ⚠️ UNMATCHED — Hebrew story has no English counterpart in THIS batch.
        // Still add it so we don't lose Hebrew content. It will upsert via story_id.
        console.log(`[Ingest] ℹ️ No English match for ${data.id} — adding Hebrew-only entry.`);
        const day = data.day || 1;
        const month = data.month || 'Adar';
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
          tags: data.tags || [],
        });
      }
    });
    }

    // PRE-UPSERT: Auto-fill missing Rabbi HE names using the permanent 'rabbis' lookup table.
    // This table is never wiped when stories are deleted, so it always has the EN→HE mapping.
    if (storiesMap.size > 0) {
      console.log("[Ingest] Auto-resolving missing Hebrew Rabbi names from 'rabbis' table...");

      // Collect unique English Rabbi names that are missing their Hebrew equivalent
      const missingHeRabbiEnNames = [...new Set(
        Array.from(storiesMap.values())
          .filter(s => !s.rabbi_he && s.rabbi_en)
          .map(s => s.rabbi_en as string)
      )];

      if (missingHeRabbiEnNames.length > 0) {
        // Query the permanent 'rabbis' lookup table (survives story deletions)
        const { data: rabbiRows } = await supabase
          .from('rabbis')
          .select('name_en, name_he')
          .in('name_en', missingHeRabbiEnNames)
          .not('name_he', 'is', null);

        // Also fall back to the stories table for any rabbis not in the lookup table yet
        const foundEnNames = new Set((rabbiRows || []).map((r: any) => r.name_en));
        const stillMissing = missingHeRabbiEnNames.filter(n => !foundEnNames.has(n));
        
        let storyFallbackRows: any[] = [];
        if (stillMissing.length > 0) {
          const { data: sfr } = await supabase
            .from('stories')
            .select('rabbi_en, rabbi_he')
            .in('rabbi_en', stillMissing)
            .not('rabbi_he', 'is', null)
            .limit(1000);
          storyFallbackRows = sfr || [];
        }

        // Build the EN→HE dictionary from both sources (rabbis table takes priority)
        const dict: Record<string, string> = {};
        for (const row of storyFallbackRows) {
          if (row.rabbi_en && row.rabbi_he) dict[row.rabbi_en] = row.rabbi_he;
        }
        for (const row of (rabbiRows || [])) {
          if (row.name_en && row.name_he) dict[row.name_en] = row.name_he;
        }

        // Apply the lookup to all stories missing rabbi_he
        for (const story of storiesMap.values()) {
          if (!story.rabbi_he && story.rabbi_en && dict[story.rabbi_en]) {
            story.rabbi_he = dict[story.rabbi_en];
            console.log(`[Ingest] 🪄 Auto-filled Rabbi (HE) for ${story.story_id}: ${story.rabbi_he}`);
          }
        }

        // Persist any new EN→HE pairs we found into the rabbis table for future use
        const newPairs = Array.from(storiesMap.values())
          .filter(s => s.rabbi_he && s.rabbi_en)
          .map(s => ({ name_en: s.rabbi_en, name_he: s.rabbi_he }));
        if (newPairs.length > 0) {
          await supabase
            .from('rabbis')
            .upsert(newPairs, { onConflict: 'name_en', ignoreDuplicates: false });
          console.log(`[Ingest] 📖 Persisted ${newPairs.length} rabbi EN→HE pairs to rabbis table`);
        }
      }
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