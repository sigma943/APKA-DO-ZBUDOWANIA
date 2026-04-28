
async function checkVehicles() {
  try {
    const response = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/vehicles');
    const data = await response.json();
    
    const v85 = data.find(v => v.label === '85' || v.vehicle_id === 85 || v.id === 85);
    const v87 = data.find(v => v.label === '87' || v.vehicle_id === 87 || v.id === 87);
    
    console.log('Vehicle 85:', v85);
    console.log('Vehicle 87:', v87);
    
    // Also look for labels ending in 85 or 87
    const suffix85 = data.filter(v => v.label?.endsWith('85'));
    const suffix87 = data.filter(v => v.label?.endsWith('87'));
    
    console.log('Vehicles ending in 85:', suffix85);
    console.log('Vehicles ending in 87:', suffix87);

    // Let's see some samples to understand the label format
    console.log('Total vehicles:', data.length);
    console.log('Sample labels:', data.slice(0, 10).map(v => v.label));

  } catch (e) {
    console.error('Error fetching API:', e);
  }
}

checkVehicles();
