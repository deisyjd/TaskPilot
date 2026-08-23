import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper delgado sobre `flutter_secure_storage`. Centraliza las llaves para
/// no repetir strings sueltos por el código.
class SecureStore {
  SecureStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;

  // Llaves
  static const kSessionCookie = 'session_cookie'; // valor de wipli-session
  static const kBearerToken = 'bearer_token'; // PAT / OAuth (fallback)
  static const kActiveCompanyId = 'active_company_id';
  static const kAuthUserJson = 'auth_user_json';

  Future<String?> read(String key) => _storage.read(key: key);

  Future<void> write(String key, String? value) async {
    if (value == null) {
      await _storage.delete(key: key);
    } else {
      await _storage.write(key: key, value: value);
    }
  }

  Future<void> delete(String key) => _storage.delete(key: key);

  Future<void> clear() => _storage.deleteAll();
}
