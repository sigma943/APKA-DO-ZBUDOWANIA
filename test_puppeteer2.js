const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('.json') || url.includes('vehicle') || url.includes('tabor')) {
       console.log('->', request.method(), url);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api') || url.includes('.json') || url.includes('vehicle') || url.includes('tabor')) {
       console.log('<-', response.status(), url);
    }
  });

  console.log("Navigating to http://einfo.zgpks.rzeszow.pl ...");
  try {
     await page.goto('http://einfo.zgpks.rzeszow.pl/', { waitUntil: 'networkidle2', timeout: 15000 });
  } catch(e) {
     console.log("Goto Error:", e.message);
  }

  await new Promise(r => setTimeout(r, 8000));
  await browser.close();
})();
