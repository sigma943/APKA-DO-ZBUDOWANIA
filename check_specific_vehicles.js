
async function fetchFleet() {
    try {
        console.log('--- Checking API: /api/its/vehicles ---');
        const vResponse = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/vehicles');
        const vData = await vResponse.json();
        
        const v85 = vData.find(v => v.label === '85' || v.id === 85);
        const v87 = vData.find(v => v.label === '87' || v.id === 87);

        console.log('Vehicle 85 (vehicles):', v85 ? v85 : 'Not found');
        console.log('Vehicle 87 (vehicles):', v87 ? v87 : 'Not found');

        console.log('\n--- Checking API: /api/its/fleet ---');
        const fResponse = await fetch('https://einfo.zgpks.rzeszow.pl/api/its/fleet');
        if (fResponse.ok) {
            const fData = await fResponse.json();
            console.log('Fleet data size:', fData.length);
            const f85 = fData.find(v => v.label === '85' || v.id === 85 || v.vehicle_id === 85);
            const f87 = fData.find(v => v.label === '87' || v.id === 87 || v.vehicle_id === 87);
            console.log('Vehicle 85 (fleet):', f85 ? f85 : 'Not found');
            console.log('Vehicle 87 (fleet):', f87 ? f87 : 'Not found');
            
            if (fData.length > 0) {
                console.log('Sample fleet item:', JSON.stringify(fData[0], null, 2));
            }
        } else {
            console.log('Fleet endpoint returned status:', fResponse.status);
        }

    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

fetchFleet();
