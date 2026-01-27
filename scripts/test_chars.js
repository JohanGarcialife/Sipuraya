// Debug character codes

const testStrings = [
  'י"א אדר',  // From test case 1
  'א\' אדר',  // From test case 2
  'כ"ח כסלו', // From test case 3
];

console.log('Character analysis:\n');

testStrings.forEach((str, i) => {
  console.log(`Test ${i+1}: "${str}"`);
  // Print each character with its code
  for (let j = 0; j < Math.min(str.length, 10); j++) {
    const char = str[j];
    const code = char.charCodeAt(0);
    const hex = code.toString(16).toUpperCase().padStart(4, '0');
    console.log(`  [${j}] '${char}' → U+${hex} (${code})`);
  }
  console.log('');
});
