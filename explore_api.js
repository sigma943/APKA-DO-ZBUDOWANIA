
async function exploreAPI() {
  const endpoints = [
    'https://einfo.zgpks.rzeszow.pl/api/its/vehicles',
    'https://einfo.zgpks.rzeszow.pl/api/its/fleet',
    'https://einfo.zgpks.rzeszow.pl/api/its/vehicle_types',
    'https://einfo.zgpks.rzeszow.pl/api/its/fleet_info'
  ];
  
  for (const url of endpoints) {
    try {
      console.log(`\n--- Fetching: ${url} ---`);
      const res = await fetch(url);
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
           console.log(`Count: ${data.length}`);
           console.log(`Sample:`, JSON.stringify(data.slice(0, 2), null, 2));
           
           const v85 = data.find(v => String(v.vehicle_id) === '85' || String(v.id) === '85');
           const v87 = data.find(v => String(v.vehicle_id) === '87' || String(v.id) === '87');
           if (v85) console.log('Found 85:', JSON.stringify(v85, null, 2));
           if (v87) console.log('Found 87:', JSON.stringify(v87, null, 2));
        } else if (data.vehicles) {
           console.log(`Vehicles count: ${data.vehicles.length}`);
           const v85 = data.vehicles.find(v => String(v.vehicle_id) === '85' || String(v.id) === '85');
           const v87 = data.vehicles.find(v => String(v.vehicle_id) === '87' || String(v.id) === '87');
           if (v85) console.log('Found 85:', JSON.stringify(v85, null, 2));
           if (v87) console.log('Found 87:', JSON.stringify(v87, null, 2));
        }
      }
    } catch (e) {
      console.log(`Error fetching ${url}: ${e.message}`);
    }
  }
}
exploreAPI();
