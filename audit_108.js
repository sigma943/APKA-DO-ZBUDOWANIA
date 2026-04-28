const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');

const now = Date.now();
const lines = {};

ws.on('message', (data) => {
    try {
        const p = JSON.parse(data.toString());
        const ln = p.journey?.line?.line_name || '---';
        if (!lines[ln]) lines[ln] = [];
        
        const posDate = p.position?.position_date;
        let age = -1;
        if (posDate) {
            const d = new Date(posDate.replace(' ', 'T'));
            // Very rough age check (assuming UTC/local mismatches might exist but 7 hours is distinct)
            // Actually let's just log the date string
            age = posDate;
        }
        
        // Only keep the latest record for each vehicle in this short scan
        const existingIdx = lines[ln].findIndex(v => v.id === p.vehicle_id);
        const record = { id: p.vehicle_id, date: posDate, delay: p.delay };
        if (existingIdx >= 0) {
            lines[ln][existingIdx] = record;
        } else {
            lines[ln].push(record);
        }
    } catch(e) {}
});

setTimeout(() => {
    console.log('Results for Line 108:');
    console.log(JSON.stringify(lines['108'] || [], null, 2));
    
    console.log('\nResults for Vehicle 87:');
    Object.keys(lines).forEach(ln => {
        const v = lines[ln].find(x => x.id === 87 || x.id === '87');
        if (v) console.log(`Found on Line ${ln}:`, v);
    });
    
    ws.close();
    process.exit(0);
}, 5000);
