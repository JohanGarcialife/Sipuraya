import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import mammoth from "mammoth";
import pdf from "pdf-parse"; // Revert to default import matching zipper.js behavior

// CONFIGURATION
export const runtime = 'nodejs'; // Required for FormData handling
export const maxDuration = 300; // Increase to 300s (5 mins) for Pro, will be capped at 60s for Hobby


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

const MONTH_MAP: Record<string, number> = {
  'nisan': 1, 'iyar': 2, 'sivan': 3, 'tamuz': 4, 'av': 5, 'elul': 6,
  'tishrei': 7, 'cheshvan': 8, 'kislev': 9, 'tevet': 10, 'shevat': 11,
  'adar': 12, 'adar i': 12, 'adar ii': 13, 'adar 1': 12, 'adar 2': 13
};

// Hebrew month names for date formatting
const HEBREW_MONTH_NAMES: Record<string, string> = {
  'Nisan': 'ניסן', 'Iyar': 'אייר', 'Sivan': 'סיון',
  'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
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
    // Generalize to find any ID format like Ad0001, Ni0001, Pe0001
    let match = line.match(/([A-Za-z]{2}\d+)/i);
    if (match) return match[1];
    
    // Handle reverse format 0001Ad -> Ad0001
    match = line.match(/(\d+)([A-Za-z]{2})/i); 
    if (match) {
        return `${match[2]}${match[1]}`;
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
    koteret: null       // Temp field for ###KOTERET extraction
  };
  
  let bodyBuffer: string[] = [];
  let tagsBuffer: string[] = [];

  const regexDate = /###Date:|###תאריך:|Date:|תאריך:/i;
  const regexTitleEn = /###English Title:|English Title:|Title:/i;
  const regexTitleHe = /###KOTERET:|###Hebrew Title:|KOTERET:|Hebrew Title:/i; 
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

    if (cleanLine.includes('###')) {
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
  
  // Split by the Hebrew ID tag pattern (Generalized for Ad, Ni, etc.)
  const regex = /#סיפור_מספר:\s*([A-Za-z]{2}\d+)/gi;
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

// --- PARSE HEBREW STORY CONTENT (Ported from zipper.js) ---
function parseHebrewStory(story: any) {
  let content = story.content;
  const tags: string[] = [];
  let rabbi_name = null;
  
  // Remove the ID tag at the beginning (Generalized)
  content = content.replace(/#סיפור_מספר:\s*[A-Za-z]{2}\d+/i, '');
  
  // Remove ###NEW STORY
  content = content.replace(/###NEW STORY/gi, '');
  
  // EXTRACT RABBI NAME
  const rabbiMatch = content.match(/###([^#]+)###/);
  if (rabbiMatch) {
    rabbi_name = rabbiMatch[1].trim();
  }
  
  // Tags extraction
  const tagPattern = /###([^#\n]+)###/g;
  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const tag = match[1].trim();
    if (tag && 
        tag !== 'NEW STORY' &&
        !tag.match(/^English Translation/i) &&
        !tag.match(/^Hebrew Translation/i) &&
        tag !== rabbi_name) {
      tags.push(tag);
    }
  }
  
  // Cleaning
  content = content.replace(/###[^#]+###/g, '');
  content = content.replace(/###NEW STORY/gi, '');
  content = content.replace(/###[^\u05d0-\u05ea]*([א-ת'])/g, '$1');
  content = content.replace(/NEW STORY/gi, '');
  content = content.replace(/###/g, '');
  
  content = content.trim();
  const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
  const dateMarkerPattern = new RegExp(`^[א-ת]+['"׳״][א-ת]*\\s*(${hebrewMonths})`, 'i');
  content = content.replace(dateMarkerPattern, '');
    
  const body = content.replace(/\s+/g, ' ').trim();
  
  return {
    id: story.id,
    body: repairHebrewText(body), // Normalize and Fix Nikkud
    tags: tags,
    rabbi_name: rabbi_name
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
    // Read FormData containing files
    const formData = await req.formData();
    console.log("🔵 API INGEST: FormData received");
    
    const fileEn = formData.get("fileEn") as File;
    const fileHe = formData.get("fileHe") as File;

    if (!fileEn || !fileHe) {
        return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    console.log(`📥 Processing files: ${fileEn.name}, ${fileHe.name}`);
    
    // Convert File to Buffer
    const bufferEn = Buffer.from(await fileEn.arrayBuffer());
    const bufferHe = Buffer.from(await fileHe.arrayBuffer());

    const textEn = await extractText(bufferEn, fileEn.name);
    const textHe = await extractText(bufferHe, fileHe.name);

    console.log(`[Ingest] TEXT PREVIEW EN: ${textEn.substring(0, 200)}`);
    console.log(`[Ingest] TEXT PREVIEW HE: ${textHe.substring(0, 200)}`);

    const splitRegex = /###\s*NEW\s*STORY/i;
    const rawStoriesEn = textEn.split(splitRegex);
    
    // Process Hebrew (special split by ID tag logic from zipper.js)
    const rawStoriesHe = splitHebrewStories(textHe);

    console.log(`[Ingest] Split Counts - EN: ${rawStoriesEn.length}, HE: ${rawStoriesHe.length}`);

    const storiesMap = new Map();

    rawStoriesEn.forEach((block, index) => {
      const data = parseStoryBlock(block);
      
      // DEBUG: Log first story failure details
      if (index === 0 && !data.id) {
          console.log(`[Ingest] DEBUG: First story failed to produce ID.`);
          console.log(`[Ingest] DEBUG: First 5 lines of block:\n${block.split('\n').slice(0, 5).join('\n')}`);
      }
      
      if (data.id) {
        const day = data.day || 1;
        const month = data.month || 'Adar';
        
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
          title_en: data.title_en,
          title_he: data.title_he || null,
          body_en: data.body,
          body_he: null,
          tags: data.tags || [],                               
        });
      }
      }
    });

    console.log(`[Ingest] English stories mapped: ${storiesMap.size}`);

    let matchCount = 0;
    rawStoriesHe.forEach(heStory => {
      // Use specialized Hebrew parser
      const data = parseHebrewStory(heStory);
      if (data.id && storiesMap.has(data.id)) {
        const existing = storiesMap.get(data.id);
        
        // Update fields if present
        if (data.body && data.body.length > 2) existing.body_he = data.body;
        if (data.rabbi_name) existing.rabbi_he = data.rabbi_name;
        
        if (!existing.title_he && data.rabbi_name) {
          existing.title_he = data.rabbi_name;
        }

        if (data.tags && data.tags.length > 0) {
          existing.tags = Array.from(new Set([...existing.tags, ...data.tags]));
        }
        matchCount++;
      }
    });

    console.log(`[Ingest] Merged HE stories. Match Count: ${matchCount}`);
    
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
    
    for (let i = 0; i < finalArray.length; i += CONCURRENCY_LIMIT) {
        const chunk = finalArray.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (story) => {
             // @ts-ignore
             const textForAI = story.body_he || story.body_en;
             
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
                if (story.tags && story.tags.length > 0) upsertPayload.tags = story.tags;
                
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