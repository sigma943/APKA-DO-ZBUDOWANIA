const WebSocket = require('ws');

const ws = new WebSocket('ws://185.214.67.112:3000/rist');
ws.on('message', (data) => {
    try {
        const parsed = JSON.parse(data.toString());
        if (parsed.next_stop_points && parsed.next_stop_points.length > 0) {
            console.log("next_stop_points fields:");
            console.log(Object.keys(parsed.next_stop_points[0]));
            console.log(JSON.stringify(parsed.next_stop_points[0], null, 2));
            ws.close();
        }
    } catch(e) {}
});
