const dns = require('dns');
dns.lookup('einfo.zgpks.rzeszow.pl', (err, address, family) => {
  console.log('einfo.zgpks.rzeszow.pl address:', address);
});
dns.lookup('zgpks.e-info.pl', (err, address) => {
  console.log('zgpks.e-info.pl address:', address);
});
dns.lookup('zgpks.rzeszow.pl', (err, address) => {
  console.log('zgpks.rzeszow.pl address:', address);
});
