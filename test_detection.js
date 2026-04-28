
async function runTest() {
  console.log('--- SYSTEM BUS DETECTION TEST ---');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // 1. Check Source API (ZGPKS)
    console.log('\n[1] Checking Source API (ZGPKS)...');
    const sourceRes = await fetch('http://einfo.zgpks.rzeszow.pl/api/its/vehicles');
    if (sourceRes.ok) {
       const sourceData = await sourceRes.json();
       const sVehicles = sourceData.vehicles || [];
       console.log('Source Total Vehicles:', sVehicles.length);
       const s108 = sVehicles.filter(v => String(v.line_name).includes('108'));
       console.log('Source Line 108 Vehicles:', s108.length);
       if (s108.length > 0) {
         console.log('Line 108 Details:', JSON.stringify(s108.map(v => ({ id: v.vehicle_id, line: v.line_name, lat: v.lat, lon: v.lng })), null, 2));
       }
    } else {
       console.log('Source API Error:', sourceRes.status);
    }

    // 2. Check Local API (Cached state)
    // Note: We use 127.0.0.1:3000 as it's the internal dev server
    console.log('\n[2] Checking Local App Cache (WebSocket/REST Merge)...');
    const localRes = await fetch('http://127.0.0.1:3000/api/vehicles');
    if (localRes.ok) {
      const localData = await localRes.json();
      const lVehicles = Array.isArray(localData) ? localData : (localData.vehicles || []);
      console.log('Local Total Vehicles:', lVehicles.length);
      const l108 = lVehicles.filter(v => String(v.routeShortName || v.name).includes('108') || String(v.id).includes('108'));
      console.log('Local Line 108 Vehicles:', l108.length);
      if (l108.length > 0) {
        console.log('Local 108 Details:', JSON.stringify(l108.map(v => ({ id: v.id, line: v.routeShortName, lat: v.lat, lon: v.lon, delay: v.delay })), null, 2));
      }
    } else {
      console.log('Local API Error:', localRes.status);
    }

  } catch (e) {
    console.error('Test execution failed:', e.message);
  }
}

runTest();
