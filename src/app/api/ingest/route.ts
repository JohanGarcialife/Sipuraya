import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

// CONFIGURATION
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
    let match = line.match(/(Ad\d+)/i);
    if (match) return match[1];
    match = line.match(/(\d+Ad)/i); 
    if (match) {
        const numbers = match[1].replace(/Ad/i, '');
        return `Ad${numbers}`;
    }
    return null;
}

async function extractText(buffer: Buffer, fileType: string) {
  try {
    if (fileType.toLowerCase().endsWith(".pdf") || fileType === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      return data.text.replace(/\n\n+/g, '\n');
    } else {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    }
  } catch (e: any) {
    console.error("Error extracting text:", e.message);
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

    if (cleanLine.includes('Ad') || cleanLine.includes('Story ID')) {
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

        // NEW: Rabbi Extraction
        const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:|הרב:/i;
        if (regexRabbi.test(cleanLine)) {
            const rabbi = cleanLine.replace(regexRabbi, '').replace(/###/g, '').trim();
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
  storyData.tags = tagsBuffer;  // NEW: Include extracted tags
  return storyData;
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
    const formData = await req.formData();
    const fileEn = formData.get("fileEn") as File;
    const fileHe = formData.get("fileHe") as File;

    if (!fileEn || !fileHe) return NextResponse.json({ error: "Missing files" }, { status: 400 });

    const bufferEn = Buffer.from(await fileEn.arrayBuffer());
    const bufferHe = Buffer.from(await fileHe.arrayBuffer());

    const textEn = await extractText(bufferEn, fileEn.name);
    const textHe = await extractText(bufferHe, fileHe.name);

    const splitRegex = /###\s*NEW\s*STORY/i;
    const rawStoriesEn = textEn.split(splitRegex);
    const rawStoriesHe = textHe.split(splitRegex);

    const storiesMap = new Map();

    rawStoriesEn.forEach(block => {
      const data = parseStoryBlock(block);
      if (data.id) {
        const day = data.day || 1;
        const month = data.month || 'Adar';
        
        storiesMap.set(data.id, {
          story_id: data.id,                                    // NEW: story_id as PRIMARY KEY
          date_he: formatHebrewDate(day, month),               // NEW: "א' אדר" format
          date_en: formatEnglishDate(day, month),              // NEW: "1 Adar" format  
          rabbi_he: null,                                      // NEW: Will be filled from Hebrew file
          rabbi_en: data.rabbi_name || null,                   // NEW: Extract from English content
          title_en: data.title_en,
          title_he: data.title_he || null,
          body_en: data.body,
          body_he: null,
          tags: data.tags || [],                               // NEW: Tags array
        });
      }
    });

    let matchCount = 0;
    rawStoriesHe.forEach(block => {
      const data = parseStoryBlock(block);
      if (data.id && storiesMap.has(data.id)) {
        const existing = storiesMap.get(data.id);
        if (data.title_he) existing.title_he = data.title_he;
        if (data.body && data.body.length > 2) existing.body_he = data.body;
        else {
             const rawClean = block.replace(/###.+/g, '').trim();
             if(rawClean.length > 10) existing.body_he = rawClean;
        }
        // NEW: Extract rabbi_he from Hebrew content (from ### tags or body)
        if (data.rabbi_name) existing.rabbi_he = data.rabbi_name;
        // Merge tags
        if (data.tags && data.tags.length > 0) {
          existing.tags = [...new Set([...existing.tags, ...data.tags])];
        }
        matchCount++;
      }
    });

    // OPTIMIZED: Parallel processing with concurrency limit to avoid timeouts
    const CONCURRENCY_LIMIT = 5;
    const finalArray = Array.from(storiesMap.values());
    let processedCount = 0;
    
    // Process in chunks
    for (let i = 0; i < finalArray.length; i += CONCURRENCY_LIMIT) {
        const chunk = finalArray.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (story) => {
            try {
                // @ts-ignore
                const textForAI = story.body_he || story.body_en;
                // Generate embedding (parallelized)
                const embedding = await generateEmbedding(textForAI);

                const { error } = await supabase.from('stories').upsert({
                    ...story,
                    embedding,
                    is_published: true
                }, { onConflict: 'story_id' });
                
                if (!error) processedCount++;
            } catch (err: any) {
                console.error(`Error processing story ${story.story_id}:`, err.message);
            }
        }));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processedCount} stories. Matches: ${matchCount}` 
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}