const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', () => {
    console.log('Connected to WebSocket');
});

let count = 0;
ws.on('message', (data) => {
    count++;
    console.log(`Message ${count}:`, data.toString().substring(0, 200));
    if (count >= 10) {
        ws.close();
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout');
    process.exit(0);
}, 10000);
