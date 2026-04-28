async function check() {
  const res = await fetch('http://phototrans.eu/24,6750,0.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const text = await res.text();
  const fs = require('fs');
  fs.writeFileSync('phototrans.html', text);
}
check();
