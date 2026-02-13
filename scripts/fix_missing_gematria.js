/**
 * fix_missing_gematria.js
 * 
 * Fixes Hebrew dates that use Arabic numerals (16-20) instead of gematria.
 * Also catches ANY Arabic numeral in date_he (1-30) as a safety net.
 * 
 * Handles Supabase's 1000-row limit via pagination.
 * 
 * Usage: node scripts/fix_missing_gematria.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Complete gematria map (1-30)
const HEBREW_DAY_NUMBERS = {
  1: "א'", 2: "ב'", 3: "ג'", 4: "ד'", 5: "ה'",
  6: "ו'", 7: "ז'", 8: "ח'", 9: "ט'", 10: "י'",
  11: 'י"א', 12: 'י"ב', 13: 'י"ג', 14: 'י"ד', 15: 'ט"ו',
  16: 'ט"ז', 17: 'י"ז', 18: 'י"ח', 19: 'י"ט', 20: "כ'",
  21: 'כ"א', 22: 'כ"ב', 23: 'כ"ג', 24: 'כ"ד', 25: 'כ"ה',
  26: 'כ"ו', 27: 'כ"ז', 28: 'כ"ח', 29: 'כ"ט', 30: "ל'",
};

/**
 * Fetch ALL rows from a table, paginating through Supabase's 1000-row limit.
 */
async function fetchAllStories() {
  const PAGE_SIZE = 1000;
  let allStories = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('stories')
      .select('story_id, date_he, date_en')
      .order('story_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching stories:', error.message);
      return null;
    }

    allStories = allStories.concat(data);
    console.log(`  Fetched rows ${from + 1} - ${from + data.length}`);

    if (data.length < PAGE_SIZE) break; // Last page
    from += PAGE_SIZE;
  }

  return allStories;
}

async function main() {
  console.log('🔍 Fetching ALL stories (with pagination)...\n');

  const stories = await fetchAllStories();
  if (!stories) return;

  console.log(`\nTotal stories in database: ${stories.length}\n`);

  // Find stories where date_he contains Arabic numerals instead of gematria
  const toFix = [];
  for (const story of stories) {
    if (!story.date_he) continue;

    // Match dates like "17 אדר", "20 ניסן", etc. (Arabic number + Hebrew month)
    const match = story.date_he.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const dayNum = parseInt(match[1]);
      const month = match[2];

      if (dayNum >= 1 && dayNum <= 30 && HEBREW_DAY_NUMBERS[dayNum]) {
        toFix.push({
          story_id: story.story_id,
          old_date_he: story.date_he,
          new_date_he: `${HEBREW_DAY_NUMBERS[dayNum]} ${month}`,
          date_en: story.date_en,
        });
      }
    }
  }

  if (toFix.length === 0) {
    console.log('✅ No stories found with Arabic numeral dates. All dates are correct!');
    return;
  }

  console.log(`Found ${toFix.length} stories to fix:\n`);
  console.log('─'.repeat(70));
  console.log(`${'ID'.padEnd(12)} ${'Old date_he'.padEnd(20)} ${'New date_he'.padEnd(20)} date_en`);
  console.log('─'.repeat(70));

  for (const item of toFix) {
    console.log(
      `${item.story_id.padEnd(12)} ${item.old_date_he.padEnd(20)} ${item.new_date_he.padEnd(20)} ${item.date_en}`
    );
  }
  console.log('─'.repeat(70));

  // Apply fixes
  console.log('\n🔧 Applying fixes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const item of toFix) {
    const { error: updateError } = await supabase
      .from('stories')
      .update({ date_he: item.new_date_he })
      .eq('story_id', item.story_id);

    if (updateError) {
      console.error(`  ❌ ${item.story_id}: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ ${item.story_id}: "${item.old_date_he}" → "${item.new_date_he}"`);
      successCount++;
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ Fixed: ${successCount} | ❌ Errors: ${errorCount} | Total: ${toFix.length}`);
  console.log(`${'═'.repeat(70)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
