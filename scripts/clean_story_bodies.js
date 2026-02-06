#!/usr/bin/env node
/**
 * Clean Metadata from Story Bodies
 * 
 * Removes metadata headers from body_en and body_he fields:
 * - Rabbi: ...
 * - KOTERET: ...
 * - English Title: ...
 * - Sources Tag: ...
 * - English Translation:
 * 
 * The body should start with the actual story content.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanBodyEnglish(bodyText) {
    if (!bodyText) return bodyText;
    
    // Remove metadata lines at the start
    let cleaned = bodyText;
    
    // Remove lines until we find "English Translation:" or actual content
    const lines = cleaned.split('\n');
    let startIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and metadata lines
        if (!line || 
            line.startsWith('Rabbi:') ||
            line.startsWith('KOTERET:') ||
            line.startsWith('English Title:') ||
            line.startsWith('Sources Tag:') ||
            line.startsWith('Date:')) {
            continue;
        }
        
        // Found "English Translation:" - content starts on next line
        if (line === 'English Translation:') {
            startIndex = i + 1;
            break;
        }
        
        // Found actual content (not a metadata line)
        startIndex = i;
        break;
    }
    
    // Rejoin from the start of actual content
    cleaned = lines.slice(startIndex).join('\n').trim();
    return cleaned;
}

function cleanBodyHebrew(bodyText) {
    if (!bodyText) return bodyText;
    
    // For Hebrew bodies, remove similar metadata
    let cleaned = bodyText;
    const lines = cleaned.split('\n');
    let startIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip metadata lines
        if (!line || 
            line.includes('רבי:') ||
            line.includes('תאריך:')) {
            continue;
        }
        
        // Found actual content
        startIndex = i;
        break;
    }
    
    cleaned = lines.slice(startIndex).join('\n').trim();
    return cleaned;
}

async function main() {
    console.log('🧹 Cleaning metadata from story bodies...\n');
    
    const { data: stories, error } = await supabase
        .from('stories')
        .select('story_id, body_en, body_he')
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
        let needsUpdate = false;
        const updates = {};
        
        // Clean English body
        if (story.body_en) {
            const cleaned = cleanBodyEnglish(story.body_en);
            if (cleaned !== story.body_en) {
                updates.body_en = cleaned;
                needsUpdate = true;
            }
        }
        
        // Clean Hebrew body
        if (story.body_he) {
            const cleaned = cleanBodyHebrew(story.body_he);
            if (cleaned !== story.body_he) {
                updates.body_he = cleaned;
                needsUpdate = true;
            }
        }
        
        if (needsUpdate) {
            process.stdout.write(`${story.story_id}...`);
            
            const { error: updateError } = await supabase
                .from('stories')
                .update(updates)
                .eq('story_id', story.story_id);
            
            if (updateError) {
                console.log(` ❌ ${updateError.message}`);
            } else {
                console.log(' ✅');
                updatedCount++;
            }
        }
    }
    
    console.log(`\n✨ Cleaned ${updatedCount} story bodies`);
}

main();
