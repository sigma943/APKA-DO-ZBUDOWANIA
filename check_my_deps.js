async function check() {
  const res = await fetch('http://localhost:3000/api/departures?stopId=11162&areaId=1214&code=04');
  const text = await res.json();
  console.log(JSON.stringify(text).substring(0, 1500));
}
check();
