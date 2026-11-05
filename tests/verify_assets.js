const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Check script tags
const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m => m[1]);
console.log('Scripts linked:', scripts);
for (const s of scripts) {
  const localPath = 'public' + (s.startsWith('/') ? s : '/' + s);
  if (!fs.existsSync(localPath)) {
    console.error('Missing script file:', localPath);
    process.exit(1);
  }
}

// Check css tags
const cssLinks = [...html.matchAll(/<link\s+[^>]*href=["']([^"']+)["']/g)].map(m => m[1]);
console.log('CSS linked:', cssLinks);
for (const c of cssLinks) {
  const localPath = 'public' + (c.startsWith('/') ? c : '/' + c);
  if (!fs.existsSync(localPath)) {
    console.error('Missing css file:', localPath);
    process.exit(1);
  }
}

console.log('All linked assets exist!');
