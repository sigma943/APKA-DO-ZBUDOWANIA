
async function getData() {
  try {
    const res = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/vehicles');
    const data = await res.json();
    const filtered = data.filter(v => v.label === '85' || v.label === '87' || v.vehicle_id === 85 || v.vehicle_id === 87);
    const fs = require('fs');
    fs.writeFileSync('/api_output.json', JSON.stringify(filtered, null, 2));
    
    // Also let's check what's on line 108
    const lineResponse = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/lines');
    const lines = await lineResponse.json();
    const line108 = lines.find(l => l.name === '108' || l.label === '108');
    fs.appendFileSync('/api_output.json', '\n\nLINE 108:\n' + JSON.stringify(line108, null, 2));
    
    if (line108) {
      // Find vehicles on this line
      const activeVehicles = data.filter(v => v.line_id === line108.id || v.line_name === '108');
      fs.appendFileSync('/api_output.json', '\n\nVEHICLES ON 108:\n' + JSON.stringify(activeVehicles, null, 2));
    }
  } catch (e) {
    const fs = require('fs');
    fs.writeFileSync('/api_output.json', 'Error: ' + e.message);
  }
}
getData();
