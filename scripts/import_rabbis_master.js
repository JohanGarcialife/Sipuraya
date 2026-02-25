/**
 * import_rabbis_master.js
 * 
 * Reads the "Rabbi Master List" sheet from the client's spreadsheet
 * and inserts all 1,358 rabbis into the Supabase `rabbis` table.
 * 
 * Usage: node scripts/import_rabbis_master.js
 */

require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

const FILE_PATH = './file/Sipuraya Rabbi Names Master list (2).xlsx';

async function main() {
  console.log('📖 Reading spreadsheet...');
  const wb = XLSX.readFile(FILE_PATH);
  const ws = wb.Sheets['Rabbi Master List'];
  
  if (!ws) {
    console.error('❌ Sheet "Rabbi Master List" not found!');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // Skip header row
  const rabbis = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name_he = (row[0] || '').toString().trim();
    const name_en = (row[1] || '').toString().trim();
    const yahrzeit_he = (row[2] || '').toString().trim();
    const yahrzeit_en = (row[3] || '').toString().trim();
    const yahrzeit_he_corrected = (row[4] || '').toString().trim();

    if (!name_en || !name_he) {
      skipped++;
      continue;
    }

    rabbis.push({
      name_he,
      name_en,
      yahrzeit_he: yahrzeit_he || null,
      yahrzeit_en: yahrzeit_en || null,
      yahrzeit_he_corrected: yahrzeit_he_corrected || null,
    });
  }

  console.log(`📊 Parsed ${rabbis.length} rabbis (${skipped} skipped due to missing data)`);

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rabbis.length; i += BATCH_SIZE) {
    const batch = rabbis.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('rabbis')
      .upsert(batch, { onConflict: 'name_en', ignoreDuplicates: true });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows`);
    }
  }

  console.log(`\n🎉 Done! ${inserted} rabbis imported, ${errors} batch errors.`);

  // Verify count
  const { count } = await supabase.from('rabbis').select('*', { count: 'exact', head: true });
  console.log(`📊 Total rabbis in DB: ${count}`);
}

main().catch(console.error);
