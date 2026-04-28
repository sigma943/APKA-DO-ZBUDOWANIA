const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', () => {
    console.log('Connected');
});

const vehicles = new Set();
ws.on('message', (data) => {
    try {
        const parsed = JSON.parse(data.toString());
        vehicles.add(parsed.vehicle_id);
    } catch(e) {}
});

setTimeout(() => {
    console.log('Unique vehicles seen in 5s:', vehicles.size);
    console.log('IDs:', Array.from(vehicles).sort((a,b) => a-b).join(', '));
    ws.close();
    process.exit(0);
}, 5000);
