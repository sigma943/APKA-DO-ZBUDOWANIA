const fs = require('fs');
const html = fs.readFileSync('phototrans.html', 'utf8');

const regex = /<td class="left"><a href="15,\d+,\d+.html">([^<]+)<\/a><\/td>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log("Model:", match[1]);
}
if (!html.match(regex)) {
   // Let's just dump tables
   const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
   let tMatch;
   let i=0;
   while ((tMatch = tableRegex.exec(html)) !== null) {
       if (tMatch[1].includes('Autosan') || tMatch[1].includes('Isuzu') || tMatch[1].includes('Iveco') || tMatch[1].includes('Mercedes')) {
           console.log(`\n\n--- TABLE ${i} ---\n`);
           console.log(tMatch[1].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' '));
       }
       i++;
   }
}
