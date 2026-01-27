// Test script - Version 5: Understanding Hebrew gematria numbers

const testCases = [
  'י"א אדררַבִּי',     // 11 Adar = yod-quote-aleph + space + adar + rabbi
  'א\' אדרנוֹלַד',    // 1 Adar = aleph-quote + space + adar + nolad
  'כ"ח כסלוהַמְּלַמֵד', // 28 Kislev = kaf-quote-chet + space + kislev + hamelamed
];

const hebrewMonths = 'ניסן|אדר|אייר|סיון|תמוז|אב|אלול|תשרי|חשון|כסלו|טבת|שבט';

// New understanding: Day can be:
// - Single letter + quote (א')
// - Letter + quote + letter (י"א, כ"ח)
// Pattern: [letter(s) WITH quote embedded] + space + month

const  patterns = [
  {
    name: 'Pattern 1: Day with embedded quote',
    // Day format: letter(s) + quote + optional letter(s), then space, then month
    regex: new RegExp(`^[א-ת]+['"\u05F3\u05F4][א-ת]*\\s+(${hebrewMonths})`, 'i')
  },
  {
    name: 'Pattern 2: With optional space',
    regex: new RegExp(`^[א-ת]+['"\u05F3\u05F4][א-ת]*\\s*(${hebrewMonths})`, 'i')
  },
];

console.log('Testing Hebrew gematria date markers:\n');

testCases.forEach((test, i) => {
  console.log(`\nTest ${i+1}: "${test}"`);
  
  patterns.forEach(({name, regex}) => {
    const match = test.match(regex);
    if (match) {
      console.log(`  ✓ ${name}`);
      console.log(`    Matched: "${match[0]}"`);
      const result = test.replace(regex, '');
      console.log(`    Result: "${result}"`);
    } else {
      console.log(`  ✗ ${name}`);
    }
  });
});
