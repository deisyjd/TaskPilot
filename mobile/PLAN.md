# Wipli Mobile — Plan (Flutter · iOS + Android)

App móvil nativa (una sola base de código Flutter) que consume la API REST que
ya existe en TaskPilot/Wipli (`/api/*`) y, más adelante, el tiempo real (SSE).

## Stack propuesto
- **Flutter** (Dart) — iOS + Android desde un solo código.
- **Estado**: Riverpod (o `flutter_riverpod`).
- **Rutas**: `go_router` (deep links).
- **HTTP**: `dio` (interceptores para el token, reintentos).
- **Auth/almacenamiento**: `flutter_secure_storage` (token de sesión/OAuth).
- **Google Sign-In**: `google_sign_in` (login con Google como en la web).
- **Push**: `firebase_messaging` (FCM para Android/iOS) + APNs.
- **Offline / persistencia local**: `drift` (SQLite) o `isar` para guardar tareas en el almacenamiento interno + `connectivity_plus` para detectar conexión.
- **Tiempo real**: SSE (`http`/`dio` stream) o WebSocket, según lo que exponga el backend.
- **CI/CD**: Codemagic o Fastlane (TestFlight / Play Internal).

## Cómo desarrollarla
1. Instalar Flutter SDK (`flutter doctor` en verde: Xcode + CocoaPods para iOS, Android SDK para Android).
2. Crear el proyecto dentro de `mobile/` (`flutter create --org com.wipli wipli_mobile`).
3. Configurar **flavors** dev/prod con la base URL del API (`--dart-define=API_URL=https://wiplitask.com`).
4. Estructura sugerida: `lib/core` (http, auth, config), `lib/data` (modelos + repos por recurso), `lib/features/{auth,dashboard,board,projects,tasks,chat,notifications}`, `lib/ui` (tema Wipli: dark #111318 + lime #DFFF5F).
5. Reusar los contratos del API web (mismos endpoints y shapes de `src/types`).
6. Correr: `flutter run` (emulador/dispositivo). Web como preview rápido opcional.

## Fases (cada una = una tarea con checklist en Wipli)

### F0 · Setup del proyecto
- Instalar Flutter y validar `flutter doctor` (iOS + Android)
- `flutter create` dentro de `mobile/` con org `com.wipli`
- Configurar flavors dev/prod y `API_URL` por `--dart-define`
- Añadir dependencias base (riverpod, go_router, dio, secure_storage)
- Estructura de carpetas + tema base (colores Wipli)

### F1 · Autenticación
- Cliente HTTP `dio` con interceptor de token + manejo de 401
- Pantalla de login (email/contraseña → `POST /api/auth/login`)
- Login con Google (`google_sign_in`) integrado con el backend
- Guardar sesión en `flutter_secure_storage` + auto-login
- Selector de empresa (multi-empresa) y cerrar sesión

### F2 · Datos y modelos
- Modelos Dart de Project/Task/Note/Reminder/User (espejo de `src/types`)
- Repositorios por recurso (proyectos, tareas, notas, recordatorios)
- Manejo de errores y estados de carga (Riverpod)
- Caché local básica para uso offline de lectura

### F2b · Offline y sincronización (tareas)
- Guardar las tareas en almacenamiento interno del dispositivo (SQLite con drift/isar)
- Leer SIEMPRE desde el almacenamiento local (funciona sin conexión, respuesta instantánea)
- Cola de cambios offline (crear/editar/completar) pendientes de subir
- Detectar conexión con `connectivity_plus` y sincronizar automáticamente al recuperar internet
- Resolución de conflictos (por timestamp / última escritura gana)
- Indicador de estado: sincronizado / pendiente / sin conexión

### F3 · Pantallas principales
- Dashboard (resumen del día)
- Tablero Kanban (arrastrar/soltar entre estados)
- Lista y detalle de proyecto (con portada/logo)
- Detalle de tarea: editar, checklist, comentarios, responsables, fechas
- Línea de tiempo (vista semanal)

### F4 · Chat y notificaciones
- Lista de conversaciones + ventana de chat
- Enviar mensajes y adjuntos
- Tiempo real (SSE/WebSocket) cuando el backend lo exponga
- Push notifications (FCM/APNs): tareas asignadas, recordatorios, mensajes

### F5 · Pulido y UX
- Tema Wipli completo (claro/oscuro, tipografía)
- i18n (es) y accesibilidad (targets táctiles, contraste)
- Deep links (abrir tarea/proyecto desde una notificación)
- Estados vacíos, errores y reintentos consistentes

### F6 · Publicación
- Íconos y splash (iOS + Android)
- Metadatos de tienda (capturas, descripción, privacidad)
- CI/CD (Codemagic/Fastlane) para builds firmados
- TestFlight (iOS) + Play Internal Testing (Android)
- Envío a revisión de App Store y Google Play

## Notas
- La app es cliente del mismo backend; no duplica lógica de negocio.
- El login con Google en móvil usa el SDK nativo + el mismo criterio invitación-solo del backend.
- Para tiempo real, alinear con la fase de SSE + Redis pub/sub del backend.
