/// Configuración de entorno de la app.
///
/// La URL base del API se inyecta en tiempo de compilación con
/// `--dart-define=API_URL=https://wiplitask.com`. Si no se define, usa
/// producción por defecto (útil para builds rápidos y web preview).
class AppConfig {
  const AppConfig._();

  /// URL base del backend (sin slash final).
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://wiplitask.com',
  );

  /// Client ID de Google (para `google_sign_in` en Android/iOS/serverAuthCode).
  /// Se pasa por `--dart-define=GOOGLE_SERVER_CLIENT_ID=...` cuando aplique.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '',
  );

  /// Nombre visible del flavor (dev/prod), solo para debug/UI.
  static const String flavor = String.fromEnvironment(
    'FLAVOR',
    defaultValue: 'prod',
  );

  static bool get isDev => flavor == 'dev';
}
