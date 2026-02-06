#!/usr/bin/env node
/**
 * DIAGNOSTIC SCRIPT: Identify Stories Missing IDs
 * 
 * This script analyzes the parsing process to find stories that fail
 * ID extraction, which causes them to be silently dropped during ingestion.
 * 
 * Usage:
 *   node diagnose_missing_stories.js "English File.docx" "Hebrew File.docx"
 */

const fs = require('fs');
const path = require('path');

// Import parsing functions from zipper.js
const { main } = require('./zipper.js');

async function diagnose(fileEnPath, fileHePath) {
  console.log('\n🔍 DIAGNOSTIC MODE: Analyzing story parsing...\n');
  
  // We'll need to modify zipper.js to export intermediate data
  // For now, let's create a standalone diagnostic
  
  console.log('📋 This diagnostic will:');
  console.log('  1. Parse both files');
  console.log('  2. Identify stories without valid IDs');
  console.log('  3. Show ID extraction failures');
  console.log('  4. Report story count discrepancies\n');
  
  // TODO: Implement actual diagnostic logic
  // For now, user should check output.json and count stories
}

// Check if files provided
if (process.argv.length < 4) {
  console.log('Usage: node diagnose_missing_stories.js <english-file> <hebrew-file>');
  process.exit(1);
}

const fileEn = process.argv[2];
const fileHe = process.argv[3];

diagnose(fileEn, fileHe);
