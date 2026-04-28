const WebSocket = require('ws');
const http = require('http');

console.log("Starting analysis...");

const ws = new WebSocket('ws://185.214.67.112:3000/rist');
let dataScraped = 0;
let observedKeys = { vehicle: new Set(), position: new Set(), journey: new Set(), journey_line: new Set() };

ws.on('message', (data) => {
    try {
        const parsed = JSON.parse(data.toString());
        if(parsed.vehicle_id) observedKeys.vehicle.add('vehicle_id');
        if(parsed.delay !== undefined) observedKeys.vehicle.add('delay');
        if(parsed.position) {
            Object.keys(parsed.position).forEach(k => observedKeys.position.add(k));
        }
        if(parsed.journey) {
            Object.keys(parsed.journey).forEach(k => {
                if(k !== 'line') observedKeys.journey.add(k);
                else {
                    Object.keys(parsed.journey.line).forEach(lk => observedKeys.journey_line.add(lk));
                }
            });
        }
        dataScraped++;
        if (dataScraped > 100) {
            console.log("WebSocket observations:");
            console.log("Position:", Array.from(observedKeys.position));
            console.log("Journey:", Array.from(observedKeys.journey));
            console.log("Journey Line:", Array.from(observedKeys.journey_line));
            
            checkDepartures();
            ws.close();
        }
    } catch(e) {}
});

async function checkDepartures() {
  http.get('http://185.214.67.112/api/its/infoboard/nearest-departures/1', { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } }, (res) => {
      let d = '';
      res.on('data', chunk => d+=chunk);
      res.on('end', () => {
         try {
             const json = JSON.parse(d);
             console.log("Departures data keys:");
             if (json.journeys && json.journeys.length > 0) {
                 console.log("Journey keys:", Object.keys(json.journeys[0]));
                 if (json.journeys[0].line) {
                     console.log("Journey.line keys:", Object.keys(json.journeys[0].line))
                 }
             }
         } catch(e) { console.log(e); }
      });
  });
}
