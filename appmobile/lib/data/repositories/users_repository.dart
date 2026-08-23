import '../../core/network/api_client.dart';
import '../models/user.dart';

/// Miembros de la empresa activa (para mostrar responsables/avatares).
class UsersRepository {
  UsersRepository(this._api);

  final ApiClient _api;

  Future<List<User>> list() async {
    final res = await _api.get<List<dynamic>>('/api/users');
    return (res.data ?? [])
        .map((e) => User.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
