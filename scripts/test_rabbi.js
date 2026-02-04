const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🧪 Testing Rabbi extraction on a single file pair...\n");

// Process just one file pair for testing
const enFile = "Adar 01 English.docx";
const heFile = "Adar 01 edit.docx";

console.log(`Processing: ${enFile} & ${heFile}`);

try {
  execSync(`node zipper.js "${enFile}" "${heFile}"`, { 
    cwd: __dirname, 
    stdio: 'inherit' 
  });
  
  // Read the output
  const data = JSON.parse(fs.readFileSync('ready_to_upload.json', 'utf8'));
  
  console.log("\n✅ Processing complete!");
  console.log(`📊 Total stories: ${data.length}`);
  
  // Check rabbi names
  const rabbis = data.filter(s => s.rabbi_en).slice(0, 10);
  
  console.log("\n🔍 Sample Rabbi Names (English):");
  rabbis.forEach(s => {
    console.log(`  ${s.story_id}: "${s.rabbi_en}"`);
  });
  
  // Check for problematic ones
  const problems = data.filter(s => 
    s.rabbi_en && (
      s.rabbi_en.endsWith(' zt') || 
      s.rabbi_en === 'Rabbi zt' ||
      s.rabbi_en === '—'
    )
  );
  
  if (problems.length > 0) {
    console.log(`\n⚠️  Found ${problems.length} stories with problematic rabbi names:`);
    problems.slice(0, 5).forEach(s => {
      console.log(`  ${s.story_id}: "${s.rabbi_en}"`);
    });
  } else {
    console.log("\n✅ No problematic rabbi names found!");
  }
  
} catch (e) {
  console.error("❌ Error:", e.message);
}
