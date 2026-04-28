
async function checkKraczkowa() {
  const stops = [
    {id: '2000', aid: '1028', c: '06', n: 'Kraczkowa, Kopciówka'},
    {id: '2009', aid: '1030', c: '14', n: 'Kraczkowa, Skrz.'},
    {id: '2015', aid: '1032', c: '08', n: 'Kraczkowa, Szk.'},
    {id: '2021', aid: '1033', c: '04', n: 'Kraczkowa, Budy'},
    {id: '2025', aid: '1034', c: '10', n: 'Kraczkowa'}
  ];
  
  console.log('--- DEPARTURES CHECK NEAR KRACZKOWA ---');
  for (const s of stops) {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/departures?stopId=${s.id}&areaId=${s.aid}&code=${s.c}`);
      const data = await res.json();
      const line108 = data.journeys?.filter(j => j.line_name.includes('108'));
      if (line108?.length > 0) {
        console.log(`Stop: ${s.n} (${s.id})`);
        line108.forEach(j => {
          console.log(`  Line: ${j.line_name} | Dest: ${j.direction} | Time: ${j.timetable_time} | Status: ${j.status}`);
        });
      }
    } catch(e) {}
  }
}
checkKraczkowa();
