const fetch = globalThis.fetch;
async function run() {
  const ip = 'http://185.214.67.112';
  const urls = [
    '/api/its/vehicles',
    '/API/Vehicles',
    '/api/vehicles'
  ];
  for (const path of urls) {
     try {
       const res = await fetch(ip + path, { 
         headers: { 'Host': 'einfo.zgpks.rzeszow.pl' },
         signal: AbortSignal.timeout(3000) 
       });
       const text = await res.text();
       console.log(path, res.status, text.length, "bytes");
       if(text.length > 0 && (text.startsWith('[') || text.startsWith('{'))){
          const parsed = JSON.parse(text);
          console.log(path, "count:", parsed.length || Object.keys(parsed).length);
          if(Array.isArray(parsed) && parsed.length > 0) {
             console.log("   First item sample:", JSON.stringify(parsed[0]).substring(0, 150));
          } else if (parsed && parsed.vehicles) {
             console.log("   Has vehicles property with count:", parsed.vehicles.length);
          }
       }
     } catch(e) {
       console.log(path, "ERROR", e);
     }
  }

  // Also test BIA (bilet) systems? 
  // Rzeszow ZTM uses API for ZTM Rzeszow. But MKS is ZG PKS.
}
run();
