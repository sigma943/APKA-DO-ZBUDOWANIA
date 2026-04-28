const WebSocket = require('ws');

const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', function open() {
  console.log('connected to RIST WebSocket');
  setTimeout(() => ws.close(), 3000);
});

ws.on('message', function incoming(data) {
  const obj = JSON.parse(data.toString());
  if (obj.journey && obj.position) {
     console.log('Got one with both!', JSON.stringify(obj));
  }
  else if (obj.journey) {
     console.log('Journey only:', JSON.stringify(obj).substring(0, 500));
  }
  else if (obj.position) {
     console.log('Position only:', JSON.stringify(obj).substring(0, 500));
  }
});
