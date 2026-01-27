// Test different pattern approaches

const test = 'א\' אדררַבִּי';

console.log('Original string:', test);
console.log('\nPatterns:');

// Literal regex with \\s
const p1 = /^[א-ת]+['"]\s*(אדר)/i;
console.log('1. Literal /\\s*/:', p1.test(test), '- Source:', p1.source);

// RegExp with template stringץand \\s
const p2 = new RegExp(`^[א-ת]+['"]\\s*(אדר)`, 'i');
console.log('2. Template \\s:', p2.test(test), '- Source:', p2.source);

// RegExp with just space
const p3 = new RegExp(`^[א-ת]+['"] *(אדר)`, 'i');
console.log('3. Template  *:', p3.test(test), '- Source:', p3.source);

// Using Hebrew characters
const p4 = new RegExp(`^[א-ת]+['"׳״]\\s*(אדר)`, 'i');
console.log('4. Hebrew chars + \\s:', p4.test(test), '- Source:', p4.source);
