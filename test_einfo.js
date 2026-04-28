const http = require('http');
http.get('http://einfo.zgpks.rzeszow.pl/api/its/vehicles', (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => console.log(res.statusCode, Buffer.concat(chunks).toString().length));
});
