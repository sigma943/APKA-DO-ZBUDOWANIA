const fetch = require('node-fetch');
const fs = require('fs');

async function scrape() {
  try {
    const res = await fetch('http://phototrans.eu/24,6750,0.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Na phototrans tabela taboru ma zwykle klasy, szukamy tagów <a> do modeli i numerów
    // Numery taborowe są w kolumnie (zwykle w tagu <td class="center"> albo coś podobnego)
    
    const lines = html.split('\n');
    let capture = false;
    let fleet = [];
    
    for (let line of lines) {
       if (line.includes('Pojazdy wg modeli')) {
          capture = true;
       }
       if (capture && line.includes('</table>')) {
          capture = false;
       }
       if (capture) {
          console.log(line.trim());
       }
    }
    
    // Jeśli format jest inny:
    let match;
    const modelRegex = /<a href="15,\d+,\d+\.html">([^<]+)<\/a>/g;
    while ((match = modelRegex.exec(html)) !== null) {
      console.log("Found model link: ", match[1]);
    }
    
  } catch (e) {
    console.error(e);
  }
}
scrape();
