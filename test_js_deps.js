const http = require('http');

http.get('http://185.214.67.112/einfo-pl.json', {
  headers: { 'Host': 'einfo.zgpks.rzeszow.pl' }
}, (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    const json = JSON.parse(text);
    console.log(json.js.map(f => f.path).join('\n'));
  });
});
