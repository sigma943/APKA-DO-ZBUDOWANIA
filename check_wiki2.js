async function check() {
  const url = encodeURI('https://pl.wikipedia.org/wiki/Związek_Gmin_„Podkarpacka_Komunikacja_Samochodowa”');
  const res = await fetch(url);
  const text = await res.text();
  require('fs').writeFileSync('wiki2.html', text);
}
check();
