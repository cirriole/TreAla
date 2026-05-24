const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\ui\\.gemini\\antigravity-ide\\brain\\e8dcee18-6d9e-4639-b445-48c27a4ec5aa\\.system_generated\\steps\\812\\content.md', 'utf-8');
const regex = /<pre><code(?:[^>]*)>([\s\S]*?)<\/code><\/pre>/g;
let m;
while((m = regex.exec(html)) !== null) {
  let code = m[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  console.log('--- CODE ---');
  console.log(code);
}
