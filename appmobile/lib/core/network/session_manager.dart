import '../storage/secure_store.dart';

/// Mantiene y persiste las credenciales de sesión.
///
/// El backend de Wipli autentica con una cookie httpOnly `wipli-session`
/// (JWT), y como alternativa acepta `Authorization: Bearer <PAT|OAuth>`.
/// En móvil persistimos el valor de esa cookie (leído del `set-cookie` de la
/// respuesta de login) y lo reenviamos en cada request. Si en vez de login por
/// contraseña se usa un token PAT/OAuth, se guarda como bearer.
class SessionManager {
  SessionManager(this._store);

  final SecureStore _store;

  String? _sessionCookie; // valor de wipli-session=...
  String? _bearerToken; // tp_live_... / tp_oauth_...

  String? get sessionCookie => _sessionCookie;
  String? get bearerToken => _bearerToken;
  bool get isAuthenticated => _sessionCookie != null || _bearerToken != null;

  /// Carga en memoria lo que haya en almacenamiento seguro (auto-login).
  Future<void> restore() async {
    _sessionCookie = await _store.read(SecureStore.kSessionCookie);
    _bearerToken = await _store.read(SecureStore.kBearerToken);
  }

  Future<void> setSessionCookie(String? value) async {
    _sessionCookie = value;
    await _store.write(SecureStore.kSessionCookie, value);
  }

  Future<void> setBearerToken(String? value) async {
    _bearerToken = value;
    await _store.write(SecureStore.kBearerToken, value);
  }

  /// Limpia todo (logout / 401).
  Future<void> clear() async {
    _sessionCookie = null;
    _bearerToken = null;
    await _store.delete(SecureStore.kSessionCookie);
    await _store.delete(SecureStore.kBearerToken);
    await _store.delete(SecureStore.kAuthUserJson);
    await _store.delete(SecureStore.kActiveCompanyId);
  }
}
