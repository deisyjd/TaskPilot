import '../../core/network/api_client.dart';
import '../models/project.dart';

/// Acceso al recurso de proyectos. La empresa activa la resuelve el backend a
/// partir de la sesión, así que aquí no se pasa companyId.
class ProjectsRepository {
  ProjectsRepository(this._api);

  final ApiClient _api;

  Future<List<Project>> list() async {
    final res = await _api.get<List<dynamic>>('/api/projects');
    return (res.data ?? [])
        .map((e) => Project.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
