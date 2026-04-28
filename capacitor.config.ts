import type { CapacitorConfig } from '@capacitor/cli';

const liveUrl = process.env.PKS_LIVE_WEB_URL;

const config: CapacitorConfig = {
  appId: 'pl.pkslive.app',
  appName: 'PKS Live',
  webDir: 'www',
  bundledWebRuntime: false,
  server: liveUrl
    ? {
        url: liveUrl,
        cleartext: liveUrl.startsWith('http://'),
      }
    : undefined,
};

export default config;
