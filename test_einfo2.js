const http = require('http');
['/api/vehicles', '/api/tabor', '/api/lines', '/api/stop-point', '/API/Vehicles'].forEach(path => {
  http.get('http://einfo.zgpks.rzeszow.pl' + path, (res) => {
    let chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => console.log(path, res.statusCode, Buffer.concat(chunks).toString().length));
  });
});
