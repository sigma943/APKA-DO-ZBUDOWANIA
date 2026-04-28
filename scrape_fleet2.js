const http = require('http');

http.get('http://phototrans.eu/24,6750,0.html', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const fs = require('fs');
    fs.writeFileSync('phototrans.html', data);
    console.log('Saved');
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
