async function test() {
    const urls = [
        'http://einfo.zgpks.rzeszow.pl/api/its/vehicles',
        'http://185.214.67.112/api/its/vehicles',
        'http://185.214.67.112/api/its/fleet',
        'http://einfo.zgpks.rzeszow.pl/api/its/fleet'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { headers: { 'Host': 'einfo.zgpks.rzeszow.pl' } });
            console.log(url, res.status);
            const text = await res.text();
            console.log(text.substring(0, 100));
        } catch (e) {
            console.log(url, 'ERROR', e.message);
        }
    }
}
test();
