const WebSocket = require('ws');
const ws = new WebSocket('ws://185.214.67.112:3000/rist');
ws.on('message', (data) => {
  const parsed = JSON.parse(data.toString());
  if (Array.isArray(parsed) && parsed.length > 0) {
    console.log("Array length:", parsed.length);
    const v = parsed.find(v => v.id === 85 || v.id === 87) || parsed[0];
    console.log(JSON.stringify(v, null, 2));
    process.exit(0);
  }
});
setTimeout(() => { process.exit(1); }, 10000);
