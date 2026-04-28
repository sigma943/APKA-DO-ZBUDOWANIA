async function check() {
  const urls = [
    'http://185.214.67.112:3000/vehicles',
    'http://185.214.67.112:3000/api/vehicles',
    'http://185.214.67.112:3000/api/fleet',
    'http://185.214.67.112:3000/fleet',
    'http://185.214.67.112:3000/models',
    'http://185.214.67.112:3000/'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(url, res.status, text.substring(0, 50));
    } catch (e) {
      console.log(url, 'Error', e.message);
    }
  }
}
check();
