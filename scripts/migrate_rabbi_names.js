/**
 * migrate_rabbi_names.js
 * 
 * Reads Sheet 2 ("Johans DB") with the 111 name mappings
 * and updates stories.rabbi_en to the canonical English name.
 * Also cross-references the rabbis table to populate stories.rabbi_he.
 * 
 * Usage: node scripts/migrate_rabbi_names.js
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
  const ws = wb.Sheets['Johans DB'];
  
  if (!ws) {
    console.error('❌ Sheet "Johans DB" not found!');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // Build mapping: old_name -> new_canonical_name
  const mappings = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const oldName = (row[1] || '').toString().trim();
    const newName = (row[2] || '').toString().trim();

    // Skip entries with no match or general descriptions
    if (!oldName || !newName) continue;
    if (newName.startsWith('[')) continue; // [No Direct Match Found], [General Description]

    mappings.push({ oldName, newName });
  }

  console.log(`📊 Found ${mappings.length} valid mappings`);

  // Load rabbis table for Hebrew name cross-reference
  console.log('🔍 Loading rabbis table for Hebrew name lookup...');
  const { data: rabbisData, error: rabbisError } = await supabase
    .from('rabbis')
    .select('name_en, name_he');

  if (rabbisError) {
    console.error('❌ Failed to load rabbis table:', rabbisError.message);
    console.log('⚠️  Continuing without Hebrew name population...');
  }

  // Build lookup: canonical_en -> hebrew_name
  const hebrewLookup = {};
  if (rabbisData) {
    for (const r of rabbisData) {
      hebrewLookup[r.name_en] = r.name_he;
    }
    console.log(`📚 Loaded ${Object.keys(hebrewLookup).length} Hebrew name mappings`);
  }

  // Process each mapping
  let updated = 0;
  let noMatch = 0;
  let errors = 0;

  for (const { oldName, newName } of mappings) {
    // Find stories with this old rabbi_en name
    const { data: stories, error: findError } = await supabase
      .from('stories')
      .select('story_id, rabbi_en')
      .eq('rabbi_en', oldName);

    if (findError) {
      console.error(`❌ Error finding "${oldName}":`, findError.message);
      errors++;
      continue;
    }

    if (!stories || stories.length === 0) {
      console.log(`⏭️  No stories found for: "${oldName}"`);
      noMatch++;
      continue;
    }

    // Build update payload
    const updatePayload = { rabbi_en: newName };
    const hebrewName = hebrewLookup[newName];
    if (hebrewName) {
      updatePayload.rabbi_he = hebrewName;
    }

    // Update all matching stories
    const { error: updateError } = await supabase
      .from('stories')
      .update(updatePayload)
      .eq('rabbi_en', oldName);

    if (updateError) {
      console.error(`❌ Error updating "${oldName}" → "${newName}":`, updateError.message);
      errors++;
    } else {
      const hebrewInfo = hebrewName ? ` + 🇮🇱 ${hebrewName.substring(0, 30)}...` : '';
      console.log(`✅ Updated ${stories.length} stories: "${oldName}" → "${newName}"${hebrewInfo}`);
      updated += stories.length;
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   ✅ ${updated} stories updated`);
  console.log(`   ⏭️  ${noMatch} mappings had no matching stories`);
  console.log(`   ❌ ${errors} errors`);
}

main().catch(console.error);
