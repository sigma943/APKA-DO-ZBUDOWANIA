async function check() {
  const urls = [
    'http://einfo.zgpks.rzeszow.pl/api/vehicles',
    'http://einfo.zgpks.rzeszow.pl/api/vehicle',
    'http://einfo.zgpks.rzeszow.pl/api/tabor',
    'http://einfo.zgpks.rzeszow.pl/api/fleet',
    'http://einfo.zgpks.rzeszow.pl/api/lines',
    'http://einfo.zgpks.rzeszow.pl/api/stop-point'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(url, res.status, text.substring(0, 100));
    } catch (e) {
      console.log(url, 'Error');
    }
  }
}
check();
