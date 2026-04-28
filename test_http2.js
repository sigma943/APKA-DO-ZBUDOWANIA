const http = require('http');

function fetchPath(path) {
  return new Promise(resolve => {
    http.get('http://185.214.67.112' + path, {
      headers: { 'Host': 'einfo.zgpks.rzeszow.pl', 'Accept': 'application/json' }
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ path, status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', e => resolve({ path, ERROR: e.message }));
  });
}

async function run() {
  const urls = [
    '/api/its/vehicles',
    '/api/vehicles',
    '/API/Vehicles',
    '/api/tabor',
    '/',
    '/api/fleet',
    '/api/lines'
  ];
  for (const u of urls) {
     const res = await fetchPath(u);
     console.log(u, res.status || res.ERROR, res.text ? res.text.substring(0, 100) : '');
  }
}
run();
