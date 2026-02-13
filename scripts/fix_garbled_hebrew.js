/**
 * fix_garbled_hebrew.js
 * 
 * Detects and repairs garbled Hebrew body text where Nikkud (vowel marks)
 * are detached from their letters due to encoding issues during ingestion.
 * 
 * Handles Supabase's 1000-row limit via pagination.
 * 
 * Usage: node scripts/fix_garbled_hebrew.js
 *   --dry-run  (default) Only report, don't fix
 *   --fix      Apply repairs to database
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = !process.argv.includes('--fix');

// ─── Fetch all stories with pagination ───
async function fetchAllStories() {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('stories')
      .select('story_id, body_he, title_he, rabbi_he, date_he')
      .order('story_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('❌ Fetch error:', error.message); return null; }
    all = all.concat(data);
    console.log(`  Fetched rows ${from + 1} - ${from + data.length}`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Repair Hebrew text with detached Nikkud (vowel marks).
 */
function repairHebrewText(text) {
  if (!text) return text;
  
  let repaired = text.normalize('NFC');
  // Remove space between any character and a Hebrew vowel/mark
  repaired = repaired.replace(/[\s\u00A0]+([\u0591-\u05C7])/g, '$1');
  // Remove dotted circle placeholder
  repaired = repaired.replace(/\u25CC/g, '');
  // Remove invisible directional and formatting characters
  repaired = repaired.replace(/[\u200E\u200F\u202A-\u202E\u00AD\u200B\uFEFF]/g, '');
  return repaired;
}

function hasDetachedNikkud(text) {
  return text && /[\s\u00A0][\u0591-\u05C7]/.test(text);
}

function hasDottedCircle(text) {
  return text && /\u25CC/.test(text);
}

function needsRepair(text) {
  return hasDetachedNikkud(text) || hasDottedCircle(text);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (use --fix to apply)' : '🔧 APPLYING FIXES'}\n`);
  console.log('Fetching ALL stories (with pagination)...\n');

  const stories = await fetchAllStories();
  if (!stories) return;

  console.log(`\nTotal stories in database: ${stories.length}\n`);

  const toFix = [];

  for (const story of stories) {
    const fields = { body_he: story.body_he, title_he: story.title_he, rabbi_he: story.rabbi_he };
    const issues = [];

    for (const [field, value] of Object.entries(fields)) {
      if (needsRepair(value)) {
        issues.push(field);
      }
    }

    if (issues.length > 0) {
      toFix.push({ story_id: story.story_id, issues, story });
    }
  }

  if (toFix.length === 0) {
    console.log('✅ No stories found with garbled Hebrew text. All good!');
    return;
  }

  console.log(`Found ${toFix.length} stories with corrupted Hebrew text:\n`);
  console.log('─'.repeat(80));

  for (const item of toFix) {
    console.log(`  ${item.story_id}: ${item.issues.join(', ')}`);
  }
  console.log('─'.repeat(80));

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN: No changes applied. Run with --fix to repair ${toFix.length} stories.`);
    return;
  }

  // Apply fixes
  console.log(`\n🔧 Applying repairs to ${toFix.length} stories...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of toFix) {
    const updateData = {};
    
    if (needsRepair(item.story.body_he)) updateData.body_he = repairHebrewText(item.story.body_he);
    if (needsRepair(item.story.title_he)) updateData.title_he = repairHebrewText(item.story.title_he);
    if (needsRepair(item.story.rabbi_he)) updateData.rabbi_he = repairHebrewText(item.story.rabbi_he);

    if (Object.keys(updateData).length === 0) continue;

    const { error: updateError } = await supabase
      .from('stories')
      .update(updateData)
      .eq('story_id', item.story_id);

    if (updateError) {
      console.error(`  ❌ ${item.story_id}: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ ${item.story_id}: repaired ${Object.keys(updateData).join(', ')}`);
      successCount++;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`✅ Fixed: ${successCount} | ❌ Errors: ${errorCount} | Total: ${toFix.length}`);
  console.log(`${'═'.repeat(80)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
