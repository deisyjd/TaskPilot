# Publicación — Wipli Mobile (F6)

Guía para llevar la app a TestFlight (iOS) y Play Internal Testing (Android), y
de ahí a las tiendas. Requiere cuentas y firmas que no viven en el repo.

## 0. Requisitos

- Flutter estable (`flutter doctor` en verde). Para Android falta el toolchain:
  instala `cmdline-tools` (Android Studio o `brew install --cask android-commandlinetools`)
  y acepta licencias: `flutter doctor --android-licenses`.
- **iOS**: Xcode + una cuenta **Apple Developer** (99 USD/año) para firmar y TestFlight.
- **Android**: una cuenta **Google Play Console** (25 USD única vez).

## 1. Identidad de la app

- Nombre del paquete / bundle id: **`com.wipli.wipli_mobile`** (definido en `flutter create`).
- Versión: se controla en `pubspec.yaml` → `version: X.Y.Z+build` (el `+build` es
  el build number que Play/App Store exigen incrementar en cada subida).

## 2. Íconos y splash

Ya configurados en `pubspec.yaml` (`flutter_launcher_icons` y
`flutter_native_splash`) con la marca Wipli (fondo ink `#111318` + logo).
Fuente: `assets/branding/`. Para regenerar tras cambiar el logo:

```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

## 3. URL del backend

La app toma la URL del API por `--dart-define`. Para builds de release:

```bash
--dart-define=API_URL=https://wiplitask.com --dart-define=FLAVOR=prod
```

## 4. Login con Google (config nativa)

El backend ya tiene el endpoint (`POST /api/auth/google/mobile`). Falta la parte nativa:

1. En Google Cloud (mismo proyecto que el `GOOGLE_CLIENT_ID` web) crea:
   - **OAuth client Android**: package `com.wipli.wipli_mobile` + huella **SHA-1**
     (obtenla con `cd android && ./gradlew signingReport`, o del keystore de release).
   - **OAuth client iOS**: bundle id `com.wipli.wipli_mobile`.
2. Corre/compila la app pasando el **client web** como serverClientId:
   `--dart-define=GOOGLE_SERVER_CLIENT_ID=<valor de GOOGLE_CLIENT_ID web>`.
3. iOS: agrega el `REVERSED_CLIENT_ID` en `Info.plist` (URL scheme) según la guía de `google_sign_in`.

## 5. Permisos nativos a revisar

- **Android** (`android/app/src/main/AndroidManifest.xml`): `INTERNET` (ya viene).
  Para llamar a un backend `http://` en DEV, añade `android:usesCleartextTraffic="true"`
  en `<application>` (en producción se usa `https://`, no hace falta).
- **iOS** (`ios/Runner/Info.plist`): para `image_picker` agrega
  `NSPhotoLibraryUsageDescription`; para dev con `http://` configura ATS
  (`NSAppTransportSecurity`). En producción con `https://` no hace falta.

## 6. Android — build de release

```bash
# 1) Crea un keystore (una sola vez, guárdalo FUERA del repo)
keytool -genkey -v -keystore ~/wipli-upload.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload

# 2) android/key.properties (NO se commitea; ya está en .gitignore)
#    storePassword=...
#    keyPassword=...
#    keyAlias=upload
#    storeFile=/Users/<tu-usuario>/wipli-upload.jks
# (y referencia key.properties en android/app/build.gradle.kts para el signingConfig release)

# 3) App Bundle firmado
flutter build appbundle --release \
  --dart-define=API_URL=https://wiplitask.com \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>

# Sube build/app/outputs/bundle/release/app-release.aab a Play Console → Internal testing.
```

## 7. iOS — build de release / TestFlight

```bash
cd ios && pod install && cd ..
flutter build ipa --release \
  --dart-define=API_URL=https://wiplitask.com \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>
```

Luego abre `build/ios/archive/*.xcarchive` en Xcode Organizer (o usa
`xcrun altool`/Transporter) para subir a **App Store Connect → TestFlight**.
Configura el equipo de firma (Signing & Capabilities) con tu Apple Developer Team.

## 8. Metadatos de tienda (checklist)

- Nombre, subtítulo, descripción (corta y larga), palabras clave.
- Capturas por tamaño de pantalla (iPhone 6.7"/6.5"/5.5", iPad; varios Android).
- Ícono 1024×1024 (App Store) — ya generado en `assets/branding/icon.png`.
- Política de privacidad (URL) y datos que recopila la app (formulario de privacidad).
- Categoría, clasificación por edad, países.

## 9. Push notifications (pendiente — Firebase)

Diferido a propósito. Cuando se aborde: crear proyecto Firebase, añadir
`google-services.json` (Android) y `GoogleService-Info.plist` (iOS), integrar
`firebase_messaging`, y en iOS subir la **APNs key** a Firebase. El tiempo real
en primer plano ya funciona por SSE sin Firebase.

## 10. CI/CD (opcional)

- **Codemagic**: `codemagic.yaml` con workflows iOS/Android, firma gestionada,
  publicación a TestFlight/Play. Más simple para Flutter.
- **Fastlane**: `fastlane/` con lanes `beta` (TestFlight) y `internal` (Play).

Los `--dart-define` (API_URL, GOOGLE_SERVER_CLIENT_ID) y las firmas se guardan
como variables/secretos en el CI, nunca en el repo.
