function parseApiTimeToMs(apiDateStr) {
  if (!apiDateStr) return Date.now();
  const targetDateT = String(apiDateStr).replace(' ', 'T');
  const dMs = new Date(targetDateT).getTime();
  if (isNaN(dMs)) return Date.now();
  
  const polTimeNowStr = new Intl.DateTimeFormat('sv-SE', { 
     timeZone: 'Europe/Warsaw', 
     year: 'numeric', month: '2-digit', day: '2-digit', 
     hour: '2-digit', minute: '2-digit', second: '2-digit' 
  }).format(new Date()).replace(' ', 'T');
  
  const nowPlMs = new Date(polTimeNowStr).getTime();
  const ageMs = nowPlMs - dMs;
  return Date.now() - ageMs;
}

const now = Date.now();
console.log("Real now (UTC):", new Date(now).toISOString());
console.log("Converted:", new Date(parseApiTimeToMs("2026-04-27 13:17:00")).toISOString());
console.log("Age (mins):", (now - parseApiTimeToMs("2026-04-27 13:17:00")) / 60000);
