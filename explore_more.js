const https = require('https');

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
    try {
        console.log("--- Vehicles endpoints ---");
        const vRes = await fetchUrl("https://zgpks.e-info.pl/API/Vehicles");
        if (vRes.length > 0) {
           console.log("Vehicle object keys:", Object.keys(vRes[0]));
           console.log("Sample vehicle:", JSON.stringify(vRes.slice(0,1), null, 2));
        }
        
        console.log("--- Routes and lines ---");
        const linesRes = await fetchUrl("https://zgpks.e-info.pl/API/Lines");
        if (linesRes.length > 0) {
           console.log("Line object keys:", Object.keys(linesRes[0]));
           console.log("Sample line:", JSON.stringify(linesRes.slice(0,1), null, 2));
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
})();
