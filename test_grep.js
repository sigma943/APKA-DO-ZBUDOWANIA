const fs = require('fs');
const content = fs.readFileSync('zgpks_app.js', 'utf8');
const regex = /\/api\/[a-zA-Z0-9_\-\/]+/g;
const matches = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
  matches.add(match[0]);
}
console.log(Array.from(matches).join('\n'));
