const http = require('http');

http.get(`http://185.214.67.112/API/Vehicles`, { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } }, (res) => {
    let d = '';
    res.on('data', chunk => d+=chunk);
    res.on('end', () => {
        try {
            console.log(d.substring(0, 500));
        } catch(e) { console.log(e); }
    });
});
