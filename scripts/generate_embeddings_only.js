#!/usr/bin/env node
/**
 * STEP 1: Generate Embeddings (VPN ON)
 * 
 * Reads ready_to_upload.json and generates embeddings for all stories.
 * Saves output to ready_with_embeddings.json
 * 
 * Usage:
 *   1. Turn VPN ON
 *   2. node generate_embeddings_only.js
 *   3. Wait for completion
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.OPENAI_API_KEY) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const fs = require('fs');
const OpenAI = require('openai');

const INPUT_FILE = path.join(__dirname, 'ready_to_upload.json');
const OUTPUT_FILE = path.join(__dirname, 'ready_with_embeddings.json');
const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_KEY) {
    console.error("❌ ERROR: Missing OPENAI_API_KEY in .env.local");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });

async function generateEmbedding(text) {
    if (!text || text.length < 10) {
        return new Array(1536).fill(0); // Dummy embedding
    }
    
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.substring(0, 8000), // Limit to 8K chars
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error(`\n⚠️ Embedding error: ${error.message}`);
        return new Array(1536).fill(0);
    }
}

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ No input file found. Run 'node zipper.js' first.");
        return;
    }

    const stories = JSON.parse(fs.readFileSync(INPUT_FILE));
    console.log(`🤖 Generating embeddings for ${stories.length} stories (VPN ON)...`);
    console.log('This will take a few minutes...\n');
    
    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        const text = story.body_he || story.body_en || '';
        
        if (!story.embedding || story.embedding.length !== 1536) {
            process.stdout.write(`[${i+1}/${stories.length}] ${story.story_id}...`);
            story.embedding = await generateEmbedding(text);
            process.stdout.write(' ✅\n');
        } else {
            process.stdout.write(`[${i+1}/${stories.length}] ${story.story_id}... (skip, has embedding)\n`);
        }
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stories, null, 2));
    console.log(`\n✨ Embeddings generated! Saved to: ${OUTPUT_FILE}`);
    console.log('\n📌 NEXT STEP:');
    console.log('   1. Turn VPN OFF');
    console.log('   2. Run: node upload_to_supabase_only.js');
}

main();
