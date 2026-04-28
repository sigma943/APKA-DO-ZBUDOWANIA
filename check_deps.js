async function check() {
  const res = await fetch('http://einfo.zgpks.rzeszow.pl/api/its/infoboard/nearest-departures/11162'); // 11162 is Podkarp Matuszczaka based on route 108 previous payload
  const text = await res.text();
  console.log(text.substring(0, 1500));
}
check();
