const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(__dirname, 'ready_to_upload.json');

// Reset the output file
if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

console.log("🚀 Starting Bulk Processing Manager...");

const files = fs.readdirSync(DATA_DIR).filter(f => !f.startsWith('.') && !f.startsWith('~$') && (f.endsWith('.docx') || f.endsWith('.pdf')));
const groups = {};

files.forEach(file => {
    const match = file.match(/(\d+)/);
    if (!match) return;
    const num = match[1];
    if (!groups[num]) groups[num] = { en: null, he: null };

    if (file.match(/English|En(\.|\s)/i)) groups[num].en = file;
    else groups[num].he = file;
});

const keys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));

for (const key of keys) {
    const pair = groups[key];
    if (pair.en && pair.he) {
        console.log(`\n⚡ Processing Group #${key}: ${pair.en} & ${pair.he}`);
        try {
            execSync(`node zipper.js "${pair.en}" "${pair.he}"`, { cwd: __dirname, stdio: 'inherit' });
        } catch (e) {
            console.error(`❌ Error in group #${key}. Skipping.`);
        }
    }
}
console.log("\n🎉 Bulk Processing Complete! Ready to upload.");