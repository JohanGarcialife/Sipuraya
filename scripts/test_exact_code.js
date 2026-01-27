// Test the EXACT code from zipper.js parseHebrewStory function

// Simulate the content after all ### cleanup
let content = 'א\' אדררַבִּי אַבְרָהָם בֶּן מֵאִיר אֶבֶּן עֶזְרָא';

console.log('Original content:', content);
console.log('Content length:', content.length);

// EXACT code from zipper.js lines 281-284
content = content.trim();
const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
const dateMarkerPattern = new RegExp(`^[א-ת]+['\"׳״][א-ת]*\\s*(${hebrewMonths})`, 'i');
content = content.replace(dateMarkerPattern, '');

console.log('\nAfter date marker removal:', content);
console.log('Did it work?', content.startsWith('רַבִּי') ? '✅ YES!' : '❌ NO');

// Debug: Test the pattern
const testMatch = 'א\' אדררַבִּי'.match(dateMarkerPattern);
console.log('\nPattern match test:', testMatch ? `✓ Matched: "${testMatch[0]}"` : '✗ No match');
