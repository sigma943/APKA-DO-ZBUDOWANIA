const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', () => {
    console.log('Connected to WebSocket');
});

const targetIds = [87, 88, 89]; // Example IDs to watch
const seenIds = new Set();

ws.on('message', (data) => {
    try {
        const p = JSON.parse(data.toString());
        seenIds.add(p.vehicle_id);
        if (targetIds.includes(p.vehicle_id) || seenIds.size < 10) {
            console.log(JSON.stringify(p, null, 2));
        }
    } catch(e) {}
});

setTimeout(() => {
    console.log('Unique IDs seen:', seenIds.size);
    ws.close();
    process.exit(0);
}, 10000);
