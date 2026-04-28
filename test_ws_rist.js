const WebSocket = require('ws');

const ws = new WebSocket('ws://185.214.67.112:3000/rist');

ws.on('open', function open() {
  console.log('connected to RIST WebSocket');
  setTimeout(() => ws.close(), 8000);
});

ws.on('message', function incoming(data) {
  console.log('got message', data.toString().substring(0, 150));
});

ws.on('error', function(e) {
  console.log('ERROR', e.message);
});
