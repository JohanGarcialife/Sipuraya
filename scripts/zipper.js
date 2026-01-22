// ...existing code...
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const DATA_DIR = path.join(__dirname, 'data');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY }); 

const MONTH_MAP = {
  'Nisan': 1, 'Iyar': 2, 'Sivan': 3, 'Tamuz': 4, 'Av': 5, 'Elul': 6,
  'Tishrei': 7, 'Cheshvan': 8, 'Kislev': 9, 'Tevet': 10, 'Shevat': 11,
  'Adar': 12, 'Adar I': 12, 'Adar II': 13
};

// --- LIMPIEZA ---
function cleanId(id) {
  if (!id) return null;
  return id.replace(/[^a-zA-Z0-9]/g, '');
}

function smartFindId(line) {
    let match = line.match(/(Ad\d+)/i);
    if (match) return match[1];
    match = line.match(/(\d+Ad)/i); // RTL invertido
    if (match) {
        const numbers = match[1].replace(/Ad/i, '');
        return `Ad${numbers}`;
    }
    return null;
}

// --- ARCHIVOS ---
function findDataFiles() {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    return { pathEn: path.join(DATA_DIR, args[0]), pathHe: path.join(DATA_DIR, args[1]) };
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const files = fs.readdirSync(DATA_DIR);
  const enFile = files.find(f => f.match(/en|english/i) && !f.startsWith('.') && !f.startsWith('~$'));
  const heFile = files.find(f => f.match(/he|hebrew/i) && !f.startsWith('.') && !f.startsWith('~$'));
  if (!enFile || !heFile) throw new Error(`❌ Faltan archivos en ${DATA_DIR}`);
  return { pathEn: path.join(DATA_DIR, enFile), pathHe: path.join(DATA_DIR, heFile) };
}

async function getFileContent(filePath) {
  if (!fs.existsSync(filePath)) return null;
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
    return null;
  }
}

// --- PARSING "CODICIOSO" (Greedy) ---

function parseStoryBlock(block) {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  const storyData = {};
  let bodyBuffer = [];

  // Regex estricto solo para Metadatos Críticos
  const regexDate = /###Date:|###תאריך:/i;
  const regexTitleEn = /###English Title:|English Title/i;
  // Koteret a veces viene pegado o separado, buscamos la palabra clave
  const regexTitleHe = /KOTERET/i; 

  lines.forEach(line => {
    let cleanLine = line.trim();
    if (!cleanLine) return;

    // 1. EXTRAER ID (Siempre prioridad)
    if (cleanLine.includes('Ad') || cleanLine.includes('Story ID')) {
        const foundId = smartFindId(cleanLine);
        if (foundId) {
            storyData.id = cleanId(foundId);
            return; // Ya tenemos ID, pasamos a la siguiente linea
        }
    }

    // 2. EXTRAER FECHA
    if (regexDate.test(cleanLine)) {
        const tempDate = cleanLine.replace(/###|Date:|תאריך:/gi, '').trim();
        const parts = tempDate.split(' ');
        if (parts.length > 0) {
             const day = parseInt(parts[0]);
             if (!isNaN(day)) storyData.day = day;
             if (parts[1]) storyData.month = parts[1];
             if (storyData.month) storyData.monthIndex = MONTH_MAP[storyData.month] || 12;
        }
        return; // No agregar fecha al cuerpo
    }

    // 3. EXTRAER TÍTULOS (Solo si la línea tiene el Tag explícito)
    if (regexTitleEn.test(cleanLine) && cleanLine.includes('###')) {
        storyData.title_en = cleanLine.replace(/###|English Title:/gi, '').trim();
        return; // No agregar título al cuerpo
    }
    
    if (regexTitleHe.test(cleanLine) && cleanLine.includes('###')) {
        storyData.title_he = cleanLine.replace(/###|KOTERET:|Hebrew Title:/gi, '').trim();
        return; // No agregar título al cuerpo
    }

    // 4. TODO LO DEMÁS ES CUERPO
    // Si la línea tiene "###" pero no es ID, Fecha o Título, la IGNORAMOS (son tags basura)
    // PERO si no tiene ###, va directo al cuerpo.
    if (!cleanLine.includes('###')) {
        // Ignorar números de página sueltos
        if (/^\d+$/.test(cleanLine)) return;
        
        bodyBuffer.push(cleanLine);
    }
  });

  storyData.body = bodyBuffer.join('\n').trim();
  return storyData;
}

async function generateEmbedding(text) {
  if (!OPENAI_API_KEY || !text || text.length < 5) return null;
  try {
    const cleanText = text.replace(/\s+/g, ' ').substring(0, 8000);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (e) {
    return null;
  }
}

// --- MAIN ---

async function main() {
  console.log("🚀 Starting Zipper V6 (Final Repair)...");

  const files = findDataFiles();
  const textEn = await getFileContent(files.pathEn);
  const textHe = await getFileContent(files.pathHe);

  if (!textEn || !textHe) return;

  const splitRegex = /###\s*NEW\s*STORY/i;
  const rawStoriesEn = textEn.split(splitRegex);
  const rawStoriesHe = textHe.split(splitRegex);

  console.log(`📊 Blocks: EN (${rawStoriesEn.length}) | HE (${rawStoriesHe.length})`);

  const storiesMap = new Map();

  // Mapear Inglés
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
        body_he: null
      });
    }
  });

  console.log(`✅ English base: ${storiesMap.size}`);

  // Mapear Hebreo
  let matchCount = 0;
  rawStoriesHe.forEach(block => {
    const data = parseStoryBlock(block);
    
    if (data.id && storiesMap.has(data.id)) {
      const existing = storiesMap.get(data.id);
      
      if (data.title_he) existing.title_he = data.title_he;
      
      // LOGICA DE RESERVA PARA CUERPO VACIO
      if (data.body && data.body.length > 5) {
          existing.body_he = data.body;
      } else {
          // Si el cuerpo está vacío, quizás el bloque entero es el cuerpo (fallback extremo)
          // Limpiamos los tags ### y usamos todo el bloque
           const rawClean = block.replace(/###.+/g, '').trim();
           if(rawClean.length > 10) {
               existing.body_he = rawClean;
               // console.log(`🔧 Recovered forced body for ${data.id}`);
           }
      }
      matchCount++;
    }
  });

  console.log(`🔗 Matches: ${matchCount}`);

  const finalArray = Array.from(storiesMap.values());
  const BATCH_SIZE = 10;
  let batch = [];

  for (let i = 0; i < finalArray.length; i++) {
    const story = finalArray[i];
    const textForAI = story.body_he || story.body_en;
    const embedding = await generateEmbedding(textForAI);

    // --- CORRECCIÓN SQL: Eliminada columna updated_at ---
    batch.push({
      ...story,
      embedding: embedding,
      is_published: true
      // updated_at ELIMINADO
    });

    if (batch.length >= BATCH_SIZE || i === finalArray.length - 1) {
      process.stdout.write(`⏳ Batch ${Math.ceil((i+1)/BATCH_SIZE)}... `);
      
      const { error } = await supabase
        .from('stories')
        .upsert(batch, { onConflict: 'external_id' });

      if (error) console.log(`❌ Error: ${error.message}`);
      else console.log(`✅ Uploaded`);
      
      batch = [];
    }
  }
  console.log("🎉 Process Completed!");
}

main();
//