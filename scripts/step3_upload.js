require('dotenv').config();
const fs = require('fs');
const path = require('path'); // Agregado
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);

const INPUT_FILE = path.join(__dirname, 'temp_ready.json');

async function main() {
    console.log("🚀 Subiendo vectores a la DB (VPN APAGADO)...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ Faltan datos. Corre el paso 2.");
        return;
    }

    const updates = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📦 Subiendo ${updates.length} vectores...`);

    for (let i = 0; i < updates.length; i++) {
        const item = updates[i];
        
        const { error } = await supabase
            .from('stories')
            .update({ embedding: item.embedding })
            .eq('id', item.id);

        if (error) console.error(`❌ Error ID ${item.id}:`, error.message);
        else process.stdout.write('.');
        
        if (i % 50 === 0) process.stdout.write(` [${i}] `);
    }

    console.log("\n🎉 ¡Misión Cumplida! Base de datos reparada.");
}

main();