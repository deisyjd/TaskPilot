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

  /// Crea una tarea. Requiere projectId + title en [fields].
  Future<Task> create(Map<String, dynamic> fields) async {
    final res = await _api.post<Map<String, dynamic>>('/api/tasks', data: fields);
    return Task.fromJson(res.data!);
  }

  /// PATCH parcial. Devuelve la tarea ya serializada por el backend.
  Future<Task> update(String taskId, Map<String, dynamic> fields) async {
    final res = await _api.patch<Map<String, dynamic>>(
      '/api/tasks/$taskId',
      data: fields,
    );
    return Task.fromJson(res.data!);
  }

  Future<Task> updateStatus(String taskId, TaskStatus status) =>
      update(taskId, {'status': status.api});

  /// El backend reemplaza el checklist completo, así que se envía entero.
  Future<Task> setChecklist(String taskId, List<ChecklistItem> items) =>
      update(taskId, {'checklist': items.map((c) => c.toJson()).toList()});
}
