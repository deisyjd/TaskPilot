import '../../core/network/api_client.dart';
import '../../core/network/session_manager.dart';
import '../models/session.dart';

/// Acceso a los endpoints de autenticación del backend.
class AuthRepository {
  AuthRepository(this._api, this._session);

  final ApiClient _api;
  final SessionManager _session;

  /// Login con email + contraseña. El `set-cookie` de la respuesta se persiste
  /// automáticamente en [ApiClient]; aquí devolvemos la sesión parseada.
  Future<Session> login({required String email, required String password}) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/api/auth/login',
      data: {'email': email, 'password': password},
    );
    return Session.fromLoginJson(res.data!);
  }

  /// Rehidrata la sesión desde el servidor usando la cookie/token guardados.
  /// Devuelve null si ya no es válida (auto-login fallido).
  Future<Session?> me() async {
    if (!_session.isAuthenticated) return null;
    try {
      final res = await _api.get<Map<String, dynamic>>('/api/auth/me');
      return Session.fromMeJson(res.data!);
    } catch (_) {
      return null;
    }
  }

  /// Cambia la empresa activa (multi-empresa). Reemite la cookie de sesión.
  Future<void> switchCompany(String companyId) async {
    await _api.post<Map<String, dynamic>>(
      '/api/auth/switch-company',
      data: {'companyId': companyId},
    );
  }

  /// Cierra sesión en el backend y limpia el almacenamiento local.
  Future<void> logout() async {
    try {
      await _api.post<Map<String, dynamic>>('/api/auth/logout');
    } catch (_) {
      // Aunque falle el server, limpiamos localmente.
    }
    await _session.clear();
  }
}
