const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');
ws.on('message', (data) => {
  const parsed = JSON.parse(data.toString());
  if (Array.isArray(parsed) && parsed.length > 0) {
    const v = parsed.find(x => x.id === 85 || x.id == 87) || parsed[0];
    console.log("Keys of vehicle:", Object.keys(v));
    if (v.vehicle) console.log("Keys of v.vehicle:", Object.keys(v.vehicle));
    if (v.journey) console.log("Keys of v.journey:", Object.keys(v.journey));
    console.log("v.id:", v.id);
    console.log("v.name:", v.name);
    console.log("v.make:", v.make);
    console.log("v.model:", v.model);
    console.log("Full JSON for vehicle:", JSON.stringify(v, null, 2));
    process.exit(0);
  }
});
setTimeout(() => { process.exit(1); }, 10000);
