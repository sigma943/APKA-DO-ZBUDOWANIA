const fs = require('fs');
const content = fs.readFileSync('zgpks_app.js', 'utf8');
const regex = /url:?['"]([^'"]+)['"]/g;
const matches = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
  matches.add(match[1]);
}
console.log(Array.from(matches).join('\n'));
