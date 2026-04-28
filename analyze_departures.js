const http = require('http');

async function checkDepartures(stopId) {
  http.get(`http://185.214.67.112/api/its/infoboard/nearest-departures/${stopId}`, { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } }, (res) => {
      let d = '';
      res.on('data', chunk => d+=chunk);
      res.on('end', () => {
         try {
             const json = JSON.parse(d);
             console.log(`Departures data for stop ${stopId}:`);
             if (json.journeys && json.journeys.length > 0) {
                 console.log("Journey keys:", Object.keys(json.journeys[0]));
                 console.log("Sample:", json.journeys[0]);
             } else {
                 console.log("No journeys");
             }
         } catch(e) { console.log(e); }
      });
  });
}

checkDepartures(10);
checkDepartures(100);
