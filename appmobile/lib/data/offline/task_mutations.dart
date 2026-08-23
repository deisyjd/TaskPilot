import '../../features/system/connectivity.dart';
import '../models/enums.dart';
import '../models/task.dart';
import '../repositories/tasks_repository.dart';
import 'outbox.dart';
import 'task_cache.dart';

/// Aplica cambios a una tarea con soporte offline (F2b):
/// - Con conexión: llama al API y actualiza la caché.
/// - Sin conexión (o si el API falla): aplica el cambio optimista a la caché y
///   encola la operación en el outbox para subirla al recuperar internet.
class TaskMutations {
  TaskMutations(this._api, this._cache, this._outbox, this._connectivity);

  final TasksRepository _api;
  final TaskCache _cache;
  final OutboxStore _outbox;
  final ConnectivityService _connectivity;

  /// Crea una tarea. Online: POST directo. Offline: crea una tarea temporal
  /// (id `local_…`) en la caché y encola un POST para cuando vuelva la conexión.
  Future<Task> createTask(
    String companyId,
    Map<String, dynamic> fields,
    Task optimistic,
  ) async {
    if (await _connectivity.isOnline()) {
      try {
        final created = await _api.create(fields);
        await _cache.upsert(companyId, created);
        return created;
      } catch (_) {
        // cae al camino offline
      }
    }
    await _cache.upsert(companyId, optimistic);
    await _outbox.add(
      OutboxOp(
        id: _newId(),
        taskId: optimistic.id, // id temporal, para limpiar la caché tras subir
        type: OutboxOpType.createTask,
        payload: fields,
        createdAt: DateTime.now().toIso8601String(),
      ),
    );
    return optimistic;
  }

  Future<Task> updateStatus(String companyId, Task task, TaskStatus status) {
    return _apply(
      companyId: companyId,
      task: task,
      fields: {'status': status.api},
      type: OutboxOpType.updateStatus,
      optimistic: task.copyWith(status: status),
    );
  }

  Future<Task> setChecklist(String companyId, Task task, List<ChecklistItem> items) {
    return _apply(
      companyId: companyId,
      task: task,
      fields: {'checklist': items.map((c) => c.toJson()).toList()},
      type: OutboxOpType.setChecklist,
      optimistic: task.copyWith(checklist: items),
    );
  }

  Future<Task> updateFields(
    String companyId,
    Task task,
    Map<String, dynamic> fields,
    Task optimistic,
  ) {
    return _apply(
      companyId: companyId,
      task: task,
      fields: fields,
      type: OutboxOpType.updateFields,
      optimistic: optimistic,
    );
  }

  Future<Task> _apply({
    required String companyId,
    required Task task,
    required Map<String, dynamic> fields,
    required OutboxOpType type,
    required Task optimistic,
  }) async {
    if (await _connectivity.isOnline()) {
      try {
        final updated = await _api.update(task.id, fields);
        await _cache.upsert(companyId, updated);
        return updated;
      } catch (_) {
        // Cae al camino offline si el API falla pese a haber conexión.
      }
    }
    await _cache.upsert(companyId, optimistic);
    await _outbox.add(
      OutboxOp(
        id: _newId(),
        taskId: task.id,
        type: type,
        payload: fields,
        createdAt: DateTime.now().toIso8601String(),
      ),
    );
    return optimistic;
  }

  static String _newId() => 'op_${DateTime.now().microsecondsSinceEpoch}';
}
