// Debug test with ACTUAL content from JSON

const testContent = 'א\' אדררַבִּי אַבְרָהָם בֶּן מֵאִיר אֶבֶּן עֶזְרָא';

console.log('Original:', testContent);
console.log('Length:', testContent.length);
console.log('\nFirst 10 characters:');
for (let i = 0; i < 10; i++) {
  const char = testContent[i];
  const code = char.charCodeAt(0);
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  console.log(`  [${i}] '${char}' U+${hex}`);
}

// Test the pattern from zipper.js
const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';
const dateMarkerPattern = new RegExp(`^[א-ת]+['"\u05F3\u05F4][א-ת]*\\s*(${hebrewMonths})`, 'i');

console.log('\nPattern test:');
const match = testContent.match(dateMarkerPattern);
if (match) {
  console.log('✓ MATCH:', match[0]);
  const result = testContent.replace(dateMarkerPattern, '');
  console.log('  Result:', result.substring(0, 50));
} else {
  console.log('✗ NO MATCH');
  
  // Try simpler patterns to debug
  console.log('\nDebug patterns:');
  const patterns = [
    { name: 'Just month', regex: new RegExp(hebrewMonths, 'i') },
    { name: 'Quote + month', regex: new RegExp(`['"]\\s*(${hebrewMonths})`, 'i') },
    { name: 'Hebrew + quote', regex: new RegExp(`^[א-ת]+['"]`, 'i') },
  ];
  
  patterns.forEach(({name, regex}) => {
    const m = testContent.match(regex);
    console.log(`  ${name}: ${m ? '✓ ' + m[0] : '✗'}`);
  });
}
