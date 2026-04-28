async function check() {
  const res = await fetch('http://einfo.zgpks.rzeszow.pl/');
  const text = await res.text();
  console.log(text.substring(0, 1000));
}
check();
