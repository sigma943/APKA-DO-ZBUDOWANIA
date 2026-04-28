async function check() {
  const res = await fetch('http://185.214.67.112:3000/');
  const text = await res.text();
  console.log(text);
}
check();
