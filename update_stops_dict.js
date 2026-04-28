
const fs = require('fs');
const path = require('path');

const toTitleCase = (str) => {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ').replace(/(?:^|[\s,\/\.\-])\S/g, (match) => match.toUpperCase());
};

async function updateDict() {
  console.log('Fetching stops from ZGPKS...');
  const response = await fetch('http://einfo.zgpks.rzeszow.pl/api/stop-point', {
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json();
  
  const stopsDict = {};
  for (const stop of data.items) {
    const areaName = stop.stop_area_name ? stop.stop_area_name.trim() : '';
    const name = stop.name ? stop.name.trim() : '';
    const finalNameRaw = areaName || name;
    let formattedName = toTitleCase(finalNameRaw);

    if (stop.stop_point_code && String(stop.stop_point_code).trim()) {
      const displayCode = String(stop.stop_point_code).trim();
      let code = displayCode;
      
      const isRzeszow = formattedName.includes('Rzeszów');
      const isRzeszowDA = isRzeszow && (formattedName.toLowerCase().includes('d.a.') || formattedName.toLowerCase().includes('dworzec'));

      // Normalize "01" to "1" EXCEPT for Rzeszów D.A.
      if (!isRzeszowDA && /^0\d$/.test(code)) {
        code = code.substring(1);
      }
      
      // Remove any trailing codes
      const words = formattedName.split(' ');
      const lastWord = words[words.length - 1];
      if (lastWord === code || lastWord === displayCode) {
         formattedName = words.slice(0, -1).join(' ').trim();
      }

      if (isRzeszow) {
        if (isRzeszowDA) {
          if (!formattedName.toLowerCase().includes('st.')) {
             formattedName += ` st. ${code}`;
          }
        } else {
          if (!formattedName.endsWith(` ${displayCode}`)) {
             formattedName += ` ${displayCode}`;
          }
        }
      }
      // For non-Rzeszów, we don't append anything
    }
    stopsDict[stop.stop_point_id] = formattedName;
  }

  const p = path.join(process.cwd(), 'app', 'api', 'vehicles', 'stops-dictionary.json');
  fs.writeFileSync(p, JSON.stringify(stopsDict, null, 2));
  console.log('Updated stops-dictionary.json with ' + Object.keys(stopsDict).length + ' stops.');
}

updateDict();
