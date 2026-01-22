require('dotenv').config();
const fs = require('fs');
const path = require('path'); // Agregado
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

// Rutas absolutas
const INPUT_FILE = path.join(__dirname, 'temp_todo.json');
const OUTPUT_FILE = path.join(__dirname, 'temp_ready.json');

async function generateEmbedding(text) {
    if (!text || text.length < 5) return null;
    try {
        const cleanText = text.replace(/\s+/g, ' ').substring(0, 8000);
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: cleanText,
            dimensions: 1536
        });
        return response.data[0].embedding;
    } catch (e) {
        console.error(`⚠️ Error OpenAI: ${e.message}`);
        return null;
    }
}

async function main() {
    console.log("🧠 Iniciando Generación de IA (VPN PRENDIDO)...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ No encuentro 'temp_todo.json'. Corre el paso 1 primero.");
        return;
    }

    const stories = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const processedStories = [];
    
    console.log(`📊 Procesando ${stories.length} historias...`);

    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        const text = story.body_he || story.body_en; 

        const embedding = await generateEmbedding(text);
        
        if (embedding) {
            processedStories.push({
                id: story.id,
                embedding: embedding
            });
            process.stdout.write('✅ ');
        } else {
            process.stdout.write('❌ ');
        }

        // Guardado parcial cada 20 items
        if (i % 20 === 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedStories, null, 2));
        }
    }

    // Guardado final
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedStories, null, 2));
    console.log(`\n\n💾 ¡Listo! Archivo creado en: ${OUTPUT_FILE}`);
    console.log("👉 AHORA: Apaga tu VPN y corre el paso 3.");
}

main();