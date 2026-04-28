# PKS Live

PKS Live to lokalna aplikacja Android zbudowana na Next.js i Capacitor.
Frontend eksportuje sie do statycznego `out/`, a APK uruchamia te pliki
bez hostowania strony z komputera.

## Lokalny start

1. Zainstaluj zaleznosci:
   `npm install`
2. Uruchom development:
   `npm run dev`

## Android

Najwazniejsze komendy:

- `npm run build:android:web` - statyczny eksport frontendu do `out/`
- `npm run android:sync` - eksport + synchronizacja z projektem `android/`
- `npm run android:build:debug` - budowa debug APK
- `npm run android:build:release` - budowa release AAB

Aplikacja dziala lokalnie z assetow wbudowanych w APK. Dane o pojazdach,
przystankach i odjazdach sa pobierane z internetu bezposrednio przez aplikacje.

## GitHub Actions

Workflow Androida buduje debug APK przy kazdym uruchomieniu. Podpisany release
AAB zbuduje sie dodatkowo, jesli ustawisz sekrety:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
