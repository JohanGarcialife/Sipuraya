const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const DATA_DIR = path.join(__dirname, 'data');
const ZIPPER_SCRIPT = 'zipper.js'; // Asegúrate que este sea el nombre de tu script principal

console.log("🚀 Iniciando el Orquestador de Carga Masiva...");

// 1. Leer archivos e ignorar basura
const files = fs.readdirSync(DATA_DIR).filter(f => !f.startsWith('.') && !f.startsWith('~$') && (f.endsWith('.docx') || f.endsWith('.pdf')));

// 2. Agrupar por Número (El identificador común)
const groups = {};

files.forEach(file => {
    // Expresión regular para encontrar el número principal (ej: "01", "14", "346")
    // Busca 1 o más dígitos.
    const match = file.match(/(\d+)/);
    
    if (!match) {
        console.warn(`⚠️ Archivo ignorado (sin número): ${file}`);
        return;
    }
    
    const num = match[1]; // El número encontrado (ej: "14")
    
    if (!groups[num]) {
        groups[num] = { en: null, he: null };
    }

    // Lógica de detección:
    // Si el nombre tiene "English" o "En" (insensible a mayúsculas) -> Es Inglés
    // Si NO -> Asumimos que es la versión Hebrea/Edit
    if (file.match(/English|En(\.|\s)/i)) {
        groups[num].en = file;
    } else {
        groups[num].he = file;
    }
});

// 3. Ejecutar Zipper para cada par
const keys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b)); // Ordenar 1, 2, 3...

console.log(`📦 Se detectaron ${keys.length} pares de historias para procesar.\n`);

for (const key of keys) {
    const pair = groups[key];
    
    // Solo ejecutamos si tenemos la pareja completa
    if (pair.en && pair.he) {
        console.log(`\n===================================================`);
        console.log(`⚡ Procesando Grupo #${key}`);
        console.log(`   🇺🇸 EN: ${pair.en}`);
        console.log(`   🇮🇱 HE: ${pair.he}`);
        console.log(`===================================================`);
        
        try {
            // Ejecutamos el zipper.js pasando los nombres entre comillas (por si tienen espacios)
            execSync(`node ${ZIPPER_SCRIPT} "${pair.en}" "${pair.he}"`, { 
                cwd: __dirname, 
                stdio: 'inherit' // Esto permite ver los logs del zipper en tiempo real
            });
        } catch (e) {
            console.error(`❌ Error fatal en el grupo #${key}. Continuando con el siguiente...`);
        }
    } else {
        console.warn(`⚠️ Grupo #${key} INCOMPLETO. Saltando...`);
        console.warn(`   Encontrado: EN=${pair.en}, HE=${pair.he}`);
    }
}

console.log("\n🎉 ¡Carga Masiva Finalizada!");