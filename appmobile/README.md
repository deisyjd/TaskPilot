# Wipli Mobile (Flutter · iOS + Android)

App móvil nativa (una sola base Flutter) que consume la API REST de
TaskPilot/Wipli (`/api/*`). Plan por fases: ver [`../mobile/PLAN.md`](../mobile/PLAN.md).

Este scaffold cubre **F0 (setup)**, **F1 (autenticación)** y la **base de F2
(modelos + repositorios + estado con Riverpod)**.

## Qué hay implementado

- **Config por entorno** (`lib/core/config`): `API_URL`, flavor y client id de
  Google por `--dart-define`.
- **Tema Wipli** oscuro (`lib/core/theme`): `#111318` + lima `#DFFF5F`.
- **Red** (`lib/core/network`): cliente `dio` con interceptor que adjunta la
  sesión, captura la cookie `wipli-session` del login y maneja 401.
- **Sesión segura** (`lib/core/storage` + `session_manager.dart`):
  persistencia en `flutter_secure_storage` y auto-login.
- **Modelos** (`lib/data/models`): espejo de `src/types` del backend
  (Project, Task, ChecklistItem, Comment, User, Company, AuthUser, Session).
- **Repositorios** (`lib/data/repositories`): auth, proyectos, tareas.
- **Estado** (Riverpod): `AuthController` (login, auto-login, cambio de
  empresa, logout, 401).
- **Pantallas**: splash, login (email/contraseña + botón Google), shell con
  bottom-nav, dashboard (resumen del día), proyectos y perfil (selector de
  empresa + logout).

## Requisitos

- Flutter SDK estable (`flutter doctor` en verde).
  - iOS: Xcode + CocoaPods. Android: Android SDK.

## Cómo generar las carpetas nativas

Este repo trae `lib/` y `pubspec.yaml`, pero **no** las carpetas
`android/`, `ios/`, etc. (se generan con la herramienta de Flutter). Desde
`appmobile/`:

```bash
# Genera android/ ios/ web/ etc. sin tocar lib/ ni pubspec.yaml
flutter create --org com.wipli --project-name wipli_mobile .
flutter pub get
```

## Correr en desarrollo

```bash
# Apuntando al backend de producción (por defecto)
flutter run

# Apuntando a un backend local (ej. Next.js en tu red)
flutter run --dart-define=API_URL=http://192.168.1.50:3000 --dart-define=FLAVOR=dev
```

> Nota iOS/Android: para llamar a un backend `http://` (sin TLS) en dev hay que
> permitir cleartext (Android `usesCleartextTraffic`, iOS ATS). En producción
> se usa `https://wiplitask.com`.

## Autenticación (cómo funciona)

El backend autentica con una **cookie httpOnly `wipli-session`** (JWT) y, como
alternativa, acepta `Authorization: Bearer` (PAT `tp_live_…` / OAuth
`tp_oauth_…`). En móvil:

1. `POST /api/auth/login` con `{ email, password }`.
2. El cliente lee el `set-cookie` de la respuesta, extrae `wipli-session` y lo
   guarda en el almacenamiento seguro.
3. Cada request reenvía esa cookie. Un `401` limpia la sesión y vuelve a login.
4. `POST /api/auth/switch-company` cambia la empresa activa (reemite la cookie).

### Login con Google (pendiente en backend)

El botón está cableado, pero el login nativo con Google necesita un endpoint
móvil en el backend que reciba el `idToken`/`serverAuthCode` del SDK
(`google_sign_in`). Hoy `/api/auth/google` es un flujo de redirección web. Ver
F1 en el plan.

## Estructura

```
lib/
  core/
    config/      # AppConfig (dart-define)
    network/     # ApiClient (dio), SessionManager, ApiException
    router/      # go_router + redirección por auth
    storage/     # SecureStore (flutter_secure_storage)
    theme/       # colores + tema Wipli
    ui/          # widgets compartidos (UserAvatar)
    providers.dart
  data/
    models/      # espejo de src/types
    repositories/# auth, projects, tasks
  features/
    auth/        # AuthController, splash, login
    dashboard/   # resumen del día
    projects/    # lista de proyectos
    profile/     # empresa activa + logout
    shell/       # bottom-nav
  main.dart
```

## Siguiente (según el plan)

- **F2b**: almacenamiento local (drift/isar) + cola offline + `connectivity_plus`.
- **F3**: tablero Kanban, detalle de tarea/proyecto, timeline.
- **F4**: chat, tiempo real (SSE/WS) y push (FCM/APNs).
