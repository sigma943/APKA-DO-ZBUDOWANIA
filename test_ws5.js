const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');
ws.on('message', (data) => {
  const parsed = JSON.parse(data.toString());
  if (parsed.vehicle_id === 85 || parsed.vehicle_id === 87 || parsed.vehicle_id === '85' || parsed.vehicle_id === '87') {
    console.log("Keys of vehicle:", Object.keys(parsed));
    console.log("Full JSON for vehicle:", JSON.stringify(parsed, null, 2));
    process.exit(0);
  }
});
setTimeout(() => { process.exit(1); }, 10000);
