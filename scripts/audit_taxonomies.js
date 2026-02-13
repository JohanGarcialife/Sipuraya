const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually load .env.local
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.error("⚠️ Could not load .env.local manually:", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTaxonomies() {
  console.log("🔍 Starting Taxonomy Audit...");

  // 1. Audit Rabbi Names (rabbi_en)
  const { data: rabbiData, error: rabbiError } = await supabase
    .from('stories')
    .select('rabbi_en')
    .not('rabbi_en', 'is', null);

  if (rabbiError) {
    console.error("❌ Error fetching rabbis:", rabbiError.message);
  } else {
    // Count occurrences
    const rabbiCounts = {};
    rabbiData.forEach(row => {
        const name = row.rabbi_en.trim();
        rabbiCounts[name] = (rabbiCounts[name] || 0) + 1;
    });

    const uniqueRabbis = Object.keys(rabbiCounts).sort();
    console.log(`\n📋 Found ${uniqueRabbis.length} Unique Rabbi Names:`);
    uniqueRabbis.forEach(name => {
        console.log(`   - "${name}" (${rabbiCounts[name]} stories)`);
    });
    
    // Save to file
    fs.writeFileSync('audit_rabbis.txt', uniqueRabbis.map(r => `${r} (${rabbiCounts[r]})`).join('\n'));
    console.log("💾 Saved rabbit list to audit_rabbis.txt");
  }

  // 2. Audit Series (series) - Check if column exists first
  // Note: This might fail if column doesn't exist yet, which is expected.
  try {
      const { data: seriesData, error: seriesError } = await supabase
        .from('stories')
        .select('series') // Will fail if column missing
        .not('series', 'is', null);

      if (seriesError) {
        console.log("\n⚠️ Series column check:", seriesError.message);
        console.log("   (Expected if migration hasn't run yet)");
      } else {
         const seriesCounts = {};
         seriesData.forEach(row => {
             const name = row.series ? row.series.trim() : null;
             if(name) seriesCounts[name] = (seriesCounts[name] || 0) + 1;
         });
         const uniqueSeries = Object.keys(seriesCounts).sort();
         console.log(`\n📺 Found ${uniqueSeries.length} Unique Series:`);
         uniqueSeries.forEach(name => console.log(`   - "${name}" (${seriesCounts[name]} stories)`));
      }
  } catch (e) {
      console.log("\n⚠️ Skipped Series audit (column likely missing)");
  }
}

auditTaxonomies();
