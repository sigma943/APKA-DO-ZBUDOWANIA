
async function checkVehicles() {
  try {
    const response = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/vehicles');
    const data = await response.json();
    
    const targets = ['85', '87', '885', '887', '985', '987', '085', '087'];
    const found = data.filter(v => targets.includes(v.label) || targets.includes(String(v.vehicle_id)));
    
    console.log('--- TARGET VEHICLES ---');
    console.log(JSON.stringify(found, null, 2));
    
    console.log('\n--- ALL LABELS (SAMPLE) ---');
    console.log(data.map(v => v.label).slice(0, 50));
    
  } catch (e) {
    console.error(e);
  }
}
checkVehicles();
