const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('stories').select('date_en').order('story_id').range(from, from + PAGE_SIZE - 1);
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const dayCounts = {};
  for (const s of all) {
    if (!s.date_en) continue;
    dayCounts[s.date_en] = (dayCounts[s.date_en] || 0) + 1;
  }

  const sorted = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
  console.log(`Top 20 dates by story count:\n`);
  for (const [date, count] of sorted.slice(0, 20)) {
    console.log(`  ${date.padEnd(20)} ${count} stories`);
  }
  console.log(`\nBottom 5:`);
  for (const [date, count] of sorted.slice(-5)) {
    console.log(`  ${date.padEnd(20)} ${count} stories`);
  }
  console.log(`\nTotal unique dates: ${sorted.length}`);
  const counts = sorted.map(x => x[1]);
  console.log(`Min: ${Math.min(...counts)}, Max: ${Math.max(...counts)}, Avg: ${(counts.reduce((a,b)=>a+b,0)/counts.length).toFixed(1)}`);
}
main();
