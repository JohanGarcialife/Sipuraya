require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; 
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
    console.error("❌ Faltan variables de entorno (.env)");
    // Imprimir para depurar (ocultando parte de la clave)
    console.log("URL:", SUPABASE_URL ? "OK" : "MISSING");
    console.log("KEY:", SUPABASE_KEY ? "OK (" + SUPABASE_KEY.slice(0, 5) + "...)" : "MISSING");
    console.log("AI:", OPENAI_API_KEY ? "OK" : "MISSING");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- FUNCIÓN DE EMBEDDING ---
async function generateEmbedding(text) {
    if (!text || text.length < 5) return null;
    const cleanText = text.replace(/\s+/g, ' ').substring(0, 8000);

    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: cleanText,
            dimensions: 1536
        });
        return response.data[0].embedding;
    } catch (e) {
        console.error(`\n⚠️ Error OpenAI: ${e.message}`);
        return null;
    }
}

// --- FUNCIÓN PRINCIPAL ---
async function main() {
    console.log("🚑 Iniciando reparación de Embeddings...");

    // 1. Obtener cuántos faltan (CON DEBUG DE ERROR)
    const { count, error } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .filter('embedding', 'is', null); // Sintaxis más explícita

    if (error) {
        console.error("❌ Error conectando a Supabase:", error.message);
        console.error("   Hint: Verifica que SUPABASE_SERVICE_ROLE_KEY sea correcta en .env");
        return;
    }

    console.log(`📉 Historias sin vector encontradas: ${count}`);

    if (count === 0) {
        console.log("🎉 ¡Todo está completo! No hay nada que reparar.");
        return;
    }

    // 2. Procesar
    const BATCH_SIZE = 20; // Bajamos un poco para ser amables con la API
    let processed = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: stories, error: fetchError } = await supabase
            .from('stories')
            .select('id, body_he, body_en')
            .filter('embedding', 'is', null) // Misma sintaxis explícita
            .limit(BATCH_SIZE);

        if (fetchError) {
            console.error("❌ Error trayendo lote:", fetchError.message);
            break;
        }

        if (!stories || stories.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`\n⚡ Procesando lote de ${stories.length}...`);

        const updates = stories.map(async (story) => {
            const text = story.body_he || story.body_en;
            
            if (!text) {
                console.log(`⏩ ID ${story.id}: Sin texto, saltando.`);
                return null;
            }

            const vector = await generateEmbedding(text);
            
            if (vector) {
                const { error: updateError } = await supabase
                    .from('stories')
                    .update({ embedding: vector })
                    .eq('id', story.id);
                
                if (updateError) console.error(`❌ Falló update ID ${story.id}: ${updateError.message}`);
                else process.stdout.write('.'); 
            }
        });

        await Promise.all(updates);
        processed += stories.length;
        console.log(` [${processed} / ${count || '?'}]`);
        
        // Pausa de 1 segundo para evitar Rate Limit 429 de OpenAI
        await new Promise(r => setTimeout(r, 1000)); 
    }

    console.log("\n✅ Reparación finalizada.");
}

main();