const fs = require('fs');
const content = fs.readFileSync('zgpks_app.js', 'utf8');
const chars = content.split(/[^a-zA-Z0-9_\-\/]+/);
const set = new Set();
chars.forEach(c => {
  if (c.length > 3 && c.length < 30) set.add(c);
});
console.log(Array.from(set).filter(s => ['vehicle', 'tabor', 'bus', 'lokal', 'gps', 'its', 'api', 'line', 'stop', 'point'].some(x => s.toLowerCase().includes(x))).join('\n'));
