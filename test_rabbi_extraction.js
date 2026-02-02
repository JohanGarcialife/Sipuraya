/**
 * Test script to debug rabbi name extraction
 * Run with: node test_rabbi_extraction.js
 */

// Simulate the parseStoryBlock regex
const regexRabbi = /###Rabbi:|### Rabbi:|Rabbi:/i;

// Test cases
const testCases = [
  {
    name: "English Rabbi tag",
    input: "###Rabbi: The Gaon Rabbi Shmuel HaLevi Kelin",
    expected: "The Gaon Rabbi Shmuel HaLevi Kelin"
  },
  {
    name: "Hebrew Rabbi tag (should NOT match English parser)",
    input: "###הרב: רבי יצחק אייזיק האלוי",
    expected: null
  },
  {
    name: "Mixed content",
    input: "###הרב אברהם יהושע העשיל מאפטא זיע\"א",
    expected: null
  }
];

console.log("=== Testing Rabbi Extraction Regex ===\n");

testCases.forEach(test => {
  const matches = regexRabbi.test(test.input);
  let extracted = null;
  
  if (matches) {
    extracted = test.input.replace(regexRabbi, '').replace(/###/g, '').trim();
  }
  
  const passed = (extracted === test.expected) || (!matches && test.expected === null);
  
  console.log(`Test: ${test.name}`);
  console.log(`Input: ${test.input}`);
  console.log(`Matches: ${matches}`);
  console.log(`Extracted: ${extracted}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('---\n');
});
