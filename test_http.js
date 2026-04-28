const http = require('http');
const req = http.get('http://185.214.67.112/api/its/vehicles', {
  headers: { 'Host': 'einfo.zgpks.rzeszow.pl', 'Accept': 'application/json' }
}, (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    console.log("Status:", res.statusCode, "Length:", text.length);
    console.log("Sample:", text.substring(0, 100));
  });
});
req.on('error', e => console.log('ERROR:', e.message));
