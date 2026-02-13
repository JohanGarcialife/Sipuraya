/**
 * check_month_names.js
 * 
 * Extracts all unique month names from date_en field in the stories table.
 * This tells us exactly what month spellings the DB uses.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAll() {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('stories')
      .select('date_en, date_he')
      .order('story_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('Error:', error.message); return null; }
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function main() {
  const stories = await fetchAll();
  if (!stories) return;

  // Extract unique month names from date_en
  const monthCounts = {};
  const monthHeMap = {}; // Map EN month -> HE month examples

  for (const s of stories) {
    if (!s.date_en) continue;
    const match = s.date_en.match(/^\d+\s+(.+)$/);
    if (match) {
      const month = match[1];
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    // Also grab the Hebrew month from date_he
    if (s.date_he) {
      const heMatch = s.date_he.match(/^.+?\s+(.+)$/);
      if (heMatch && match) {
        monthHeMap[match[1]] = heMatch[1];
      }
    }
  }

  console.log('📊 Month names found in date_en field:\n');
  console.log('─'.repeat(50));
  console.log(`${'Month (EN)'.padEnd(20)} ${'Count'.padEnd(10)} Month (HE)`);
  console.log('─'.repeat(50));

  const sorted = Object.entries(monthCounts).sort((a, b) => b[1] - a[1]);
  for (const [month, count] of sorted) {
    console.log(`${month.padEnd(20)} ${String(count).padEnd(10)} ${monthHeMap[month] || '?'}`);
  }
  console.log('─'.repeat(50));
  console.log(`\nTotal unique month names: ${Object.keys(monthCounts).length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
