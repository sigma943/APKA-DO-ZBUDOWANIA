const http = require('http');

http.get(`http://185.214.67.112/api/its/vehicles`, { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } }, (res) => {
    let d = '';
    res.on('data', chunk => d+=chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(d);
            console.log(`Pobrane pojazdy: ${data.length}`);
            if (data.length > 0) {
                console.log("Dostępne pola w pojeździe (REST API):", Object.keys(data[0]));
                let example = data.find(v => v.delay !== 0);
                if (!example) example = data[0];
                console.log("Przykładowe dane z REST:", example);
                
                // Let's also check departures
                http.get(`http://185.214.67.112/api/its/infoboard/nearest-departures/${example.last_stop_point_number || 199}`, { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } }, (res2) => {
                    let d2 = '';
                    res2.on('data', chunk => d2+=chunk);
                    res2.on('end', () => {
                        const json2 = JSON.parse(d2);
                        if (json2.journeys && json2.journeys.length > 0) {
                            console.log("Dostępne pola w odjazdach:", Object.keys(json2.journeys[0]));
                            if (json2.journeys[0].line) {
                                console.log("Pola w line_name:", Object.keys(json2.journeys[0].line));
                            }
                            console.log("Przykładowy wyjazd:", json2.journeys[0]);
                        }
                    });
                });
            }
        } catch(e) { console.log(e); }
    });
});
