# PKS Live

PKS Live to aplikacja Next.js opakowana jako Android WebView przez Capacitor.

## Lokalny start

1. Zainstaluj zaleznosci:
   `npm install`
2. Skonfiguruj zmienne srodowiskowe potrzebne przez aplikacje webowa.
3. Uruchom development:
   `npm run dev`

## Android

Androidowa powloka laduje hostowana wersje PKS Live ustawiona przez
`PKS_LIVE_WEB_URL`.

Najwazniejsze komendy:

- `npm run android:sync` - synchronizacja Capacitor z projektem `android/`
- `npm run android:build:debug` - budowa debug APK
- `npm run android:build:release` - budowa release AAB

Jesli `PKS_LIVE_WEB_URL` nie jest ustawione, aplikacja uruchomi lokalny ekran
informacyjny z instrukcja konfiguracji.

## GitHub Actions

Workflow Androida buduje zawsze debug APK, a dodatkowo podpisany release AAB,
jesli ustawisz sekrety:

- `PKS_LIVE_WEB_URL`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
