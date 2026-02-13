/**
 * audit_database.js
 * 
 * Comprehensive audit of ALL stories in the database.
 * Checks: missing fields, garbled text, date formatting, encoding issues, etc.
 * 
 * Usage: node scripts/audit_database.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Fetch all stories with pagination ───
async function fetchAllStories() {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('story_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('❌ Fetch error:', error.message); return null; }
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// ─── Checks ───
function hasDetachedNikkud(text) {
  return text && /[\s\u00A0][\u0591-\u05C7]/.test(text);
}

function hasArabicNumeralDate(dateHe) {
  return dateHe && /^\d+\s+/.test(dateHe);
}

function hasInvisibleChars(text) {
  return text && /[\u200E\u200F\u202A-\u202E\u00AD\u200B\uFEFF\u25CC]/.test(text);
}

function isEffectivelyEmpty(text) {
  if (!text) return true;
  return text.trim().length === 0;
}

function hasControlChars(text) {
  if (!text) return false;
  // Control chars except newline, tab, carriage return
  return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text);
}

async function main() {
  console.log('📊 COMPREHENSIVE DATABASE AUDIT');
  console.log('═'.repeat(80));
  console.log('');

  const stories = await fetchAllStories();
  if (!stories) return;
  console.log(`Total stories: ${stories.length}\n`);

  // ── Counters ──
  const issues = {
    missing_title_en: [],
    missing_title_he: [],
    missing_body_en: [],
    missing_body_he: [],
    missing_rabbi_en: [],
    missing_rabbi_he: [],
    missing_date_en: [],
    missing_date_he: [],
    missing_tags: [],
    empty_tags: [],
    arabic_numeral_date: [],
    detached_nikkud_body: [],
    detached_nikkud_title: [],
    detached_nikkud_rabbi: [],
    invisible_chars_body_he: [],
    invisible_chars_body_en: [],
    invisible_chars_title: [],
    control_chars: [],
    duplicate_ids: [],
    malformed_id: [],
    missing_embedding: [],
  };

  // Check for duplicate IDs
  const idCounts = {};
  for (const s of stories) {
    idCounts[s.story_id] = (idCounts[s.story_id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) issues.duplicate_ids.push(id);
  }

  // ── Check each story ──
  for (const s of stories) {
    const id = s.story_id;

    // ID format check (should be like Ad0001, Ni0033)
    if (!/^[A-Z][a-z]\d{4}$/.test(id)) {
      issues.malformed_id.push(id);
    }

    // Missing fields
    if (isEffectivelyEmpty(s.title_en)) issues.missing_title_en.push(id);
    if (isEffectivelyEmpty(s.title_he)) issues.missing_title_he.push(id);
    if (isEffectivelyEmpty(s.body_en))  issues.missing_body_en.push(id);
    if (isEffectivelyEmpty(s.body_he))  issues.missing_body_he.push(id);
    if (isEffectivelyEmpty(s.rabbi_en)) issues.missing_rabbi_en.push(id);
    if (isEffectivelyEmpty(s.rabbi_he)) issues.missing_rabbi_he.push(id);
    if (isEffectivelyEmpty(s.date_en))  issues.missing_date_en.push(id);
    if (isEffectivelyEmpty(s.date_he))  issues.missing_date_he.push(id);

    // Tags
    if (s.tags === null || s.tags === undefined) issues.missing_tags.push(id);
    else if (Array.isArray(s.tags) && s.tags.length === 0) issues.empty_tags.push(id);

    // Embedding
    if (!s.embedding) issues.missing_embedding.push(id);

    // Date format
    if (hasArabicNumeralDate(s.date_he)) issues.arabic_numeral_date.push(id);

    // Detached Nikkud
    if (hasDetachedNikkud(s.body_he))  issues.detached_nikkud_body.push(id);
    if (hasDetachedNikkud(s.title_he)) issues.detached_nikkud_title.push(id);
    if (hasDetachedNikkud(s.rabbi_he)) issues.detached_nikkud_rabbi.push(id);

    // Invisible/control characters
    if (hasInvisibleChars(s.body_he))  issues.invisible_chars_body_he.push(id);
    if (hasInvisibleChars(s.body_en))  issues.invisible_chars_body_en.push(id);
    if (hasInvisibleChars(s.title_he) || hasInvisibleChars(s.title_en)) issues.invisible_chars_title.push(id);
    if (hasControlChars(s.body_he) || hasControlChars(s.body_en) || hasControlChars(s.title_he) || hasControlChars(s.title_en)) {
      issues.control_chars.push(id);
    }
  }

  // ── Report ──
  console.log('─'.repeat(80));
  console.log('ISSUE REPORT');
  console.log('─'.repeat(80));

  const categories = [
    { label: '🔤 Missing Data', items: [
      { key: 'missing_title_en', label: 'Missing English title' },
      { key: 'missing_title_he', label: 'Missing Hebrew title' },
      { key: 'missing_body_en',  label: 'Missing English body' },
      { key: 'missing_body_he',  label: 'Missing Hebrew body' },
      { key: 'missing_rabbi_en', label: 'Missing English rabbi' },
      { key: 'missing_rabbi_he', label: 'Missing Hebrew rabbi' },
      { key: 'missing_date_en',  label: 'Missing English date' },
      { key: 'missing_date_he',  label: 'Missing Hebrew date' },
      { key: 'missing_tags',     label: 'Missing tags (null)' },
      { key: 'empty_tags',       label: 'Empty tags (0 items)' },
      { key: 'missing_embedding', label: 'Missing embedding vector' },
    ]},
    { label: '📅 Date Issues', items: [
      { key: 'arabic_numeral_date', label: 'Arabic numeral in date_he' },
    ]},
    { label: '🔣 Encoding Issues', items: [
      { key: 'detached_nikkud_body',  label: 'Detached Nikkud in body_he' },
      { key: 'detached_nikkud_title', label: 'Detached Nikkud in title_he' },
      { key: 'detached_nikkud_rabbi', label: 'Detached Nikkud in rabbi_he' },
      { key: 'invisible_chars_body_he', label: 'Invisible chars in body_he' },
      { key: 'invisible_chars_body_en', label: 'Invisible chars in body_en' },
      { key: 'invisible_chars_title', label: 'Invisible chars in title' },
      { key: 'control_chars',          label: 'Control characters' },
    ]},
    { label: '🆔 ID Issues', items: [
      { key: 'malformed_id',  label: 'Malformed story ID' },
      { key: 'duplicate_ids', label: 'Duplicate story IDs' },
    ]},
  ];

  let totalIssues = 0;

  for (const cat of categories) {
    console.log(`\n${cat.label}`);
    for (const item of cat.items) {
      const list = issues[item.key];
      const count = list.length;
      totalIssues += count;
      const status = count === 0 ? '✅' : '⚠️';
      const countStr = `(${count})`.padStart(6);
      console.log(`  ${status} ${countStr} ${item.label}`);
      
      // Show first 10 affected IDs if any
      if (count > 0 && count <= 20) {
        console.log(`         IDs: ${list.join(', ')}`);
      } else if (count > 20) {
        console.log(`         First 10: ${list.slice(0, 10).join(', ')}...`);
        console.log(`         Last 5:   ${list.slice(-5).join(', ')}`);
      }
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`SUMMARY: ${totalIssues} total issues found across ${stories.length} stories`);
  console.log(`${'═'.repeat(80)}`);

  // ── Sample problematic stories for review ──
  const sampleIds = new Set();
  for (const key of Object.keys(issues)) {
    if (issues[key].length > 0 && issues[key].length <= 5) {
      issues[key].forEach(id => sampleIds.add(id));
    }
  }

  if (sampleIds.size > 0 && sampleIds.size <= 10) {
    console.log(`\n\nDETAILED SAMPLE of stories with rare issues:\n`);
    for (const id of sampleIds) {
      const s = stories.find(x => x.story_id === id);
      if (!s) continue;
      console.log(`─── ${s.story_id} ───`);
      console.log(`  date_he: "${s.date_he || '(empty)'}"`);
      console.log(`  date_en: "${s.date_en || '(empty)'}"`);
      console.log(`  rabbi_he: "${s.rabbi_he || '(empty)'}"`);
      console.log(`  rabbi_en: "${s.rabbi_en || '(empty)'}"`);
      console.log(`  title_he: "${s.title_he || '(empty)'}"`);
      console.log(`  title_en: "${s.title_en || '(empty)'}"`);
      console.log(`  body_he: ${s.body_he ? `(${s.body_he.length} chars)` : '(empty)'}`);
      console.log(`  body_en: ${s.body_en ? `(${s.body_en.length} chars)` : '(empty)'}`);
      console.log(`  tags: ${JSON.stringify(s.tags)}`);
      console.log(`  embedding: ${s.embedding ? 'present' : 'MISSING'}`);
      console.log('');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
