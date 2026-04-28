const WebSocket = require('ws');

const ws = new WebSocket('ws://einfo.zgpks.rzeszow.pl:7681/', {
  headers: {
    'Origin': 'http://einfo.zgpks.rzeszow.pl',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
  }
});

ws.on('open', function open() {
  console.log('connected');
});

ws.on('message', function incoming(data) {
  console.log('got message. length: ', data.length);
  console.log(data.toString().substring(0, 100));
  ws.close();
});

ws.on('error', function(e) {
  console.log('ERROR', e.message);
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
}, 5000);
