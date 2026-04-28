
async function checkStops() {
  const response = await fetch('http://einfo.zgpks.rzeszow.pl/api/stop-point', {
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json();
  const daStops = data.items.filter(s => {
      const name = (s.stop_area_name || s.name || '').toLowerCase();
      return name.includes('rzeszów') && (name.includes('d.a.') || name.includes('dworzec'));
  });
  
  console.log(JSON.stringify(daStops, null, 2));
}

checkStops();
