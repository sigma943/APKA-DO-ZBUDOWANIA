const fetch = globalThis.fetch;
async function run() {
  const urls = [
    'https://einfo.zgpks.rzeszow.pl/api/its/vehicles',
    'http://einfo.zgpks.rzeszow.pl/api/its/vehicles',
    'https://einfo.zgpks.rzeszow.pl/api/vehicles',
    'https://zgpks.e-info.pl/API/Vehicles',
  ];
  for (const u of urls) {
     try {
       const res = await fetch(u, { signal: AbortSignal.timeout(3000) });
       const text = await res.text();
       console.log(u, res.status, text.length, "bytes");
       if(text.length > 0 && text.startsWith('[')){
          const parsed = JSON.parse(text);
          console.log(u, "count:", parsed.length);
          if(parsed.length > 0) {
             console.log("   First item sample:", JSON.stringify(parsed[0]).substring(0, 150));
          }
       }
     } catch(e) {
       console.log(u, "ERROR", e.message);
     }
  }
}
run();
