const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const jsFiles = [
  'public/js/api.js',
  'public/js/auth.js',
  'public/js/dashboard.js',
  'public/js/evaluation.js',
  'public/js/history.js',
  'public/js/app.js'
];

const getElementByIdMatches = [];
for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)];
  for (const m of matches) {
    getElementByIdMatches.push({ file, id: m[1] });
  }
}

const missing = [];
for (const item of getElementByIdMatches) {
  const pattern = new RegExp(`id=["']${item.id}["']`);
  if (!pattern.test(html)) {
    missing.push(item);
  }
}

console.log('Total getElementById checks:', getElementByIdMatches.length);
console.log('Missing IDs:', missing);

if (missing.length > 0) {
  process.exit(1);
} else {
  console.log('All IDs match perfectly!');
}

