const WebSocket = require('ws');

const ws = new WebSocket('ws://185.214.67.112:7681');
// Try with direct IP
// Or ws://einfo.zgpks.rzeszow.pl:7681/

ws.on('open', function open() {
  console.log('connected');
});

ws.on('message', function incoming(data) {
  console.log('got message. length: ', data.length);
  // print first 200 chars
  console.log(data.toString().substring(0, 200));
  ws.close();
});

ws.on('error', function(e) {
  console.log('ERROR', e.message);
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
}, 5000);
