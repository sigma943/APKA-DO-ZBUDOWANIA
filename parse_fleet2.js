const fs = require('fs');
const html = fs.readFileSync('phototrans.html', 'utf8');

// Let's print the entire raw text without HTML tags that matches known bus brands
const cleanHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<[^>]+>/g, '\n');

const lines = cleanHtml.split('\n').filter(l => l.trim().length > 0);
let index = lines.findIndex(l => l.includes('Pojazdy wg modeli'));
if (index !== -1) {
    for (let i = index; i < index + 200 && i < lines.length; i++) {
        console.log(lines[i].trim());
    }
} else {
    console.log("Not found block. Printing all lines with brands...");
    lines.forEach(l => {
       if (l.includes('Isuzu') || l.includes('Autosan') || l.includes('Iveco')) {
           console.log(l.trim());
       }
    });
}
