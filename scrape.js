async function fetchPhototrans() {
  const res = await fetch('https://phototrans.eu/24,6750,0,Zwi__zek_Gmin_Podkarpacka_Komunikacja_Samochodowa_Rzesz_w.html', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (res.ok) {
     const text = await res.text();
     const fs = require('fs');
     fs.writeFileSync('photo.html', text);
     console.log("Saved photo.html");
  } else { console.log("Failed"); }
}
fetchPhototrans();
