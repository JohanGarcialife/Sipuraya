#!/usr/bin/env node
/**
 * Extract Rabbi Names from Body Text
 * 
 * For stories Ad1289-Ad1409 that have rabbi names in the body text
 * but not in the rabbi_en/rabbi_he fields, this script extracts them
 * and updates the database.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extractRabbiFromBody(bodyText) {
    if (!bodyText) return null;
    
    // Pattern: "Rabbi: [name]" at the start of body
    const match = bodyText.match(/^Rabbi:\s*(.+?)(?:\n|$)/i);
    if (match) {
        return match[1].trim();
    }
    return null;
}

async function main() {
    console.log('🔍 Fetching stories Ad1289-Ad1409...\n');
    
    const { data: stories, error } = await supabase
        .from('stories')
        .select('story_id, rabbi_en, body_en')
        .gte('story_id', 'Ad1289')
        .lte('story_id', 'Ad1409')
        .order('story_id');
    
    if (error) {
        console.error('❌ Error fetching stories:', error);
        return;
    }
    
    console.log(`Found ${stories.length} stories\n`);
    
    let updatedCount = 0;
    
    for (const story of stories) {
        if (!story.rabbi_en && story.body_en) {
            const rabbi = extractRabbiFromBody(story.body_en);
            if (rabbi) {
                console.log(`${story.story_id}: "${rabbi}"`);
                
                const { error: updateError } = await supabase
                    .from('stories')
                    .update({ rabbi_en: rabbi })
                    .eq('story_id', story.story_id);
                
                if (updateError) {
                    console.error(`  ❌ Error: ${updateError.message}`);
                } else {
                    updatedCount++;
                }
            }
        }
    }
    
    console.log(`\n✨ Updated ${updatedCount} stories with rabbi names`);
}

main();
