import '../../core/network/api_client.dart';
import '../models/enums.dart';
import '../models/task.dart';

/// Acceso al recurso de tareas. Soporta los filtros del lado del servidor
/// (projectId, status, assigneeId) que expone GET /api/tasks.
class TasksRepository {
  TasksRepository(this._api);

  final ApiClient _api;

  Future<List<Task>> list({
    String? projectId,
    TaskStatus? status,
    String? assigneeId,
  }) async {
    final query = <String, dynamic>{};
    if (projectId != null) query['projectId'] = projectId;
    if (status != null) query['status'] = status.api;
    if (assigneeId != null) query['assigneeId'] = assigneeId;

    final res = await _api.get<List<dynamic>>(
      '/api/tasks',
      query: query.isEmpty ? null : query,
    );
    return (res.data ?? [])
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
