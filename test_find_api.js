const http = require('http');

http.get('http://185.214.67.112/einfo-pl.js', {
  headers: { 'Host': 'einfo.zgpks.rzeszow.pl' }
}, (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    const regex = /\/\/[^\s"'<>\\]+/g;
    const regex2 = /\/api\/[a-zA-Z0-9_\-\/]+/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
      if(match[0].includes('api') || match[0].includes('vehicles')) {
         matches.add(match[0]);
      }
    }
    while ((match = regex2.exec(text)) !== null) {
      matches.add(match[0]);
    }
    console.log(Array.from(matches).join('\n'));
  });
});
