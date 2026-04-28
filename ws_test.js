const WebSocket = require('ws');

const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === 'REFRESH_VEHICLES' && parsed.vehicles && parsed.vehicles.length > 0) {
      console.log("Found vehicles!");
      const v = parsed.vehicles.find(v => v.id === 85 || v.id === 87) || parsed.vehicles[0];
      console.log(JSON.stringify(v, null, 2));
      process.exit(0);
    }
  } catch (e) {
    console.error(e);
  }
});

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 10000);
