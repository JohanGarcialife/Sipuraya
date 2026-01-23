require("dotenv").config();
const fs = require("fs");
const path = require("path"); // Agregado
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

// Archivo a guardar en la MISMA carpeta que este script
const FILE_PATH = path.join(__dirname, "temp_todo.json");

async function main() {
  console.log("📡 Descargando historias sin vectores (VPN APAGADO)...");

  // NOTA: Supabase tiene un límite de 1000 filas por defecto.
  // Usamos rangos para traer más si es necesario, pero 1000 por lote está bien.
  const { data, error } = await supabase
    .from("stories")
    .select("id, body_he, body_en")
    .is("embedding", null)
    .limit(1000); // Límite explícito

  if (error) {
    console.error("❌ Error Supabase:", error.message);
    return;
  }

  console.log(`✅ Se encontraron ${data.length} historias pendientes.`);

  // Guardar usando la ruta absoluta
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));

  console.log(`💾 Guardado en: ${FILE_PATH}`);
  console.log("👉 AHORA: Activa tu VPN y corre el paso 2.");
}

main();
