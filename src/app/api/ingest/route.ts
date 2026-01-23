import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import mammoth from "mammoth";
import * as pdfParse from "pdf-parse";

// --- CONFIGURATION ---
// Use Service Role to bypass RLS and allow writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

const MONTH_MAP: Record<string, number> = {
  Nisan: 1,
  Iyar: 2,
  Sivan: 3,
  Tamuz: 4,
  Av: 5,
  Elul: 6,
  Tishrei: 7,
  Cheshvan: 8,
  Kislev: 9,
  Tevet: 10,
  Shevat: 11,
  Adar: 12,
  "Adar I": 12,
  "Adar II": 13,
};

// --- HELPER FUNCTIONS (Ported from zipper.js) ---

function cleanId(id: string) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

function smartFindId(line: string) {
  let match = line.match(/(Ad\d+)/i);
  if (match) return match[1];
  match = line.match(/(\d+Ad)/i); // RTL Inverted check
  if (match) {
    const numbers = match[1].replace(/Ad/i, "");
    return `Ad${numbers}`;
  }
  return null;
}

// --- TEXT EXTRACTION ---

async function extractText(buffer: Buffer, fileType: string) {
  try {
    // Check file extension or mime type
    if (fileType.endsWith(".pdf") || fileType === "application/pdf") {
      const data = await (pdfParse as any)(buffer);
      return data.text.replace(/\n\n+/g, "\n");
    } else {
      // Assume DOCX/Word
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    }
  } catch (e: any) {
    console.error("Error extracting text:", e.message);
    return "";
  }
}

// --- PARSING LOGIC (V7 - Greedy Body) ---

function parseStoryBlock(block: string) {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  const storyData: any = {};
  let bodyBuffer: string[] = [];

  const regexDate = /###Date:|###תאריך:/i;
  const regexTitleEn = /###English Title:|English Title/i;
  const regexTitleHe = /KOTERET/i;

  lines.forEach((line) => {
    let cleanLine = line.trim();
    if (!cleanLine) return;

    // 1. ID Detection
    if (cleanLine.includes("Ad") || cleanLine.includes("Story ID")) {
      const foundId = smartFindId(cleanLine);
      if (foundId) {
        storyData.id = cleanId(foundId);
        return;
      }
    }

    // 2. Metadata Tags
    if (cleanLine.includes("###")) {
      if (regexDate.test(cleanLine)) {
        const tempDate = cleanLine.replace(/###|Date:|תאריך:/gi, "").trim();
        const parts = tempDate.split(" ");
        if (parts.length > 0) {
          const day = parseInt(parts[0]);
          if (!isNaN(day)) storyData.day = day;
          if (parts[1]) storyData.month = parts[1];
          if (storyData.month)
            storyData.monthIndex = MONTH_MAP[storyData.month] || 12;
        }
        return;
      }
      if (regexTitleEn.test(cleanLine)) {
        storyData.title_en = cleanLine
          .replace(/###|English Title:/gi, "")
          .trim();
        return;
      }
      if (regexTitleHe.test(cleanLine)) {
        storyData.title_he = cleanLine
          .replace(/###|KOTERET:|Hebrew Title:/gi, "")
          .trim();
        return;
      }
      return; // Ignore other tags
    } else {
      // 3. Body Content (Greedy)
      if (/^\d+$/.test(cleanLine)) return; // Skip page numbers
      bodyBuffer.push(cleanLine);
    }
  });

  storyData.body = bodyBuffer.join("\n").trim();
  return storyData;
}

// --- AI EMBEDDING (Blindado) ---

async function generateEmbedding(text: string) {
  // 1. Validación básica
  if (!text || typeof text !== "string" || text.length < 5) return null;

  try {
    // 2. Limpieza y Recorte Agresivo
    // Reemplazamos saltos de línea por espacios
    // Y cortamos a 4000 caracteres MÁXIMO (aprox 1000-2000 tokens, muy seguro)
    const cleanText = text.replace(/\s+/g, " ").slice(0, 4000);

    // DEBUG: Descomenta esto si quieres ver qué está mandando
    // console.log(`🔤 Generando embedding para texto de longitud: ${cleanText.length}`);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (e: any) {
    // 3. Manejo de Errores Específico
    if (
      e.code === "context_length_exceeded" ||
      (e.message && e.message.includes("tokens"))
    ) {
      console.warn(
        "⚠️ Texto demasiado largo para AI, intentando recorte extremo..."
      );

      // REINTENTO DE EMERGENCIA: Cortar a 1000 caracteres
      try {
        const shorterText = text.slice(0, 1000);
        const retryResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: shorterText,
          dimensions: 1536,
        });
        return retryResponse.data[0].embedding;
      } catch (retryError) {
        console.error("❌ Falló el reintento de embedding:", retryError);
        return null;
      }
    }

    console.error("AI Error (General):", e.message);
    return null;
  }
}

// --- MAIN API HANDLER ---

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 API: Starting Batch Ingest...");

    const formData = await req.formData();
    const fileEn = formData.get("fileEn") as File;
    const fileHe = formData.get("fileHe") as File;

    if (!fileEn || !fileHe) {
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    // Convert to Buffers
    const bufferEn = Buffer.from(await fileEn.arrayBuffer());
    const bufferHe = Buffer.from(await fileHe.arrayBuffer());

    // Extract Text
    const textEn = await extractText(bufferEn, fileEn.name);
    const textHe = await extractText(bufferHe, fileHe.name);

    // Split Blocks
    const splitRegex = /###\s*NEW\s*STORY/i;
    const rawStoriesEn = textEn.split(splitRegex);
    const rawStoriesHe = textHe.split(splitRegex);

    // Map English Base
    const storiesMap = new Map();
    rawStoriesEn.forEach((block: string) => {
      const data = parseStoryBlock(block);
      if (data.id) {
        storiesMap.set(data.id, {
          external_id: data.id,
          hebrew_day: data.day || 1,
          hebrew_month: data.month || "Adar",
          hebrew_month_index: data.monthIndex || 12,
          title_en: data.title_en,
          body_en: data.body,
          title_he: data.title_he || null,
          body_he: null,
        });
      }
    });

    // Merge Hebrew
    let matchCount = 0;
    rawStoriesHe.forEach((block: string) => {
      const data = parseStoryBlock(block);
      if (data.id && storiesMap.has(data.id)) {
        const existing = storiesMap.get(data.id);
        if (data.title_he) existing.title_he = data.title_he;
        if (data.body && data.body.length > 5) {
          existing.body_he = data.body;
        } else {
          // Fallback for Hebrew text
          const rawClean = block.replace(/###.+/g, "").trim();
          if (rawClean.length > 10) existing.body_he = rawClean;
        }
        matchCount++;
      }
    });

    // Generate Embeddings & Upsert
    const finalArray = Array.from(storiesMap.values());
    let processedCount = 0;

    // Note: Processing one by one to avoid OpenAI Rate Limits in serverless env
    for (const story of finalArray) {
      // @ts-ignore
      const textForAI = story.body_he || story.body_en;
      const embedding = await generateEmbedding(textForAI);

      const { error } = await supabase.from("stories").upsert(
        {
          ...story,
          embedding,
          is_published: true,
        },
        { onConflict: "external_id" }
      );

      if (!error) processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} stories successfully. Matched: ${matchCount}`,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
