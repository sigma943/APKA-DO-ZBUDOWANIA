const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');

const now = Date.now();
const vehicles = [];

ws.on('message', (data) => {
    try {
        const p = JSON.parse(data.toString());
        vehicles.push(p);
    } catch(e) {}
});

setTimeout(() => {
    console.log('Total messages:', vehicles.length);
    const uniqueIds = new Set(vehicles.map(v => v.vehicle_id));
    console.log('Unique vehicles:', uniqueIds.size);

    let hasJourney = 0;
    let freshPos = 0;
    let lineNames = new Set();

    uniqueIds.forEach(id => {
        const v = vehicles.findLast(x => x.vehicle_id === id);
        if (v.journey) {
            hasJourney++;
            const ln = v.journey?.line?.line_name || v.journey?.line?.name;
            if (ln) lineNames.add(ln);
        }
        if (v.position && v.position.position_date) {
            const d = new Date(v.position.position_date.replace(' ', 'T'));
            const age = (now - d.getTime()) / 1000;
            if (age < 300) freshPos++;
        }
    });

    console.log('Vehicles with journey:', hasJourney);
    console.log('Vehicles with position < 5 min old (relative to script start):', freshPos);
    console.log('Line names:', Array.from(lineNames).join(', '));
    ws.close();
    process.exit(0);
}, 5000);
