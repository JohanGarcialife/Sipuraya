const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_JSON = path.join(__dirname, 'ready_to_upload.json');
const ZIPPER_SCRIPT = path.join(__dirname, 'zipper.js');

console.log('🚀 Batch Processor for Sipuraya Stories');
console.log('='.repeat(50));

// Function to get all file pairs from data directory
function getFilePairs() {
    const files = fs.readdirSync(DATA_DIR);
    const pairs = [];
    
    // Strategy: Match "Adar XX English.docx" with "Adar XX edit.docx"
    const adarEnglishFiles = files.filter(f => f.match(/^Adar \d+ English/i));
    
    adarEnglishFiles.forEach(enFile => {
        const match = enFile.match(/^Adar (\d+) English/i);
        if (match) {
            const day = match[1];
            const heFile = files.find(f => f.match(new RegExp(`^Adar ${day} edit\\.docx`, 'i')));
            
            if (heFile) {
                pairs.push({
                    english: enFile,
                    hebrew: heFile,
                    name: `Adar Day ${day}`
                });
            } else {
                console.warn(`⚠️  No Hebrew file found for: ${enFile}`);
            }
        }
    });
    
    // Strategy for Peninei files: Match "Peninei XXX English.docx" with "peninei XXX.docx"
    const penineiEnglishFiles = files.filter(f => f.match(/^Peninei \d+ English/i));
    
    penineiEnglishFiles.forEach(enFile => {
        const match = enFile.match(/^Peninei (\d+) English/i);
        if (match) {
            const num = match[1];
            const heFile = files.find(f => f.match(new RegExp(`^peninei ${num}\\.docx`, 'i')));
            
            if (heFile) {
                pairs.push({
                    english: enFile,
                    hebrew: heFile,
                    name: `Peninei ${num}`
                });
            } else {
                console.warn(`⚠️  No Hebrew file found for: ${enFile}`);
            }
        }
    });
    
    return pairs;
}

// Main execution
async function main() {
    // Clear previous output
    if (fs.existsSync(OUTPUT_JSON)) {
        console.log('🗑️  Clearing previous ready_to_upload.json...');
        fs.unlinkSync(OUTPUT_JSON);
    }
    
    const pairs = getFilePairs();
    console.log(`\n📊 Found ${pairs.length} file pairs to process\n`);
    
    if (pairs.length === 0) {
        console.error('❌ No file pairs found! Check data directory.');
        process.exit(1);
    }
    
    // Show what we're going to process
    console.log('📋 File Pairs:');
    pairs.forEach((pair, idx) => {
        console.log(`   ${idx + 1}. ${pair.name}`);
        console.log(`      EN: ${pair.english}`);
        console.log(`      HE: ${pair.hebrew}\n`);
    });
    
    console.log('='.repeat(50));
    console.log('🔄 Starting batch processing...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        console.log(`[${i + 1}/${pairs.length}] Processing: ${pair.name}`);
        
        try {
            // Execute zipper.js for this pair
            const cmd = `node "${ZIPPER_SCRIPT}" "${pair.english}" "${pair.hebrew}"`;
            execSync(cmd, {
                cwd: __dirname,
                stdio: 'inherit' // Show zipper.js output
            });
            successCount++;
            console.log(`✅ ${pair.name} completed\n`);
        } catch (error) {
            errorCount++;
            console.error(`❌ ${pair.name} failed:`, error.message, '\n');
        }
    }
    
    console.log('='.repeat(50));
    console.log('📊 Batch Processing Complete!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (fs.existsSync(OUTPUT_JSON)) {
        const data = JSON.parse(fs.readFileSync(OUTPUT_JSON));
        console.log(`   📦 Total stories in JSON: ${data.length}`);
        console.log(`\n✨ Ready for upload! Run: node final_upload.js`);
    } else {
        console.error('\n❌ No output JSON generated!');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
