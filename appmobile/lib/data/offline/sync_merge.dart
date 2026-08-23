import '../models/task.dart';

/// Resolución de conflictos (F2b): última escritura gana.
///
/// Al refrescar desde el servidor, las tareas con cambios locales pendientes
/// ([pendingTaskIds]) conservan su versión local (es la escritura más reciente,
/// aún sin subir); el resto toma la versión del servidor. También se comparan
/// timestamps `updatedAt` como desempate cuando ambos existen.
List<Task> mergeTasks({
  required List<Task> server,
  required List<Task> local,
  required Set<String> pendingTaskIds,
}) {
  final localById = {for (final t in local) t.id: t};
  final result = <Task>[];

  for (final s in server) {
    final l = localById[s.id];
    if (l != null && pendingTaskIds.contains(s.id)) {
      // Hay un cambio local sin subir → gana lo local.
      result.add(l);
    } else if (l != null && _isNewer(l.updatedAt, s.updatedAt)) {
      // Sin cambio pendiente pero lo local es más reciente por timestamp.
      result.add(l);
    } else {
      result.add(s);
    }
  }

  // Tareas creadas localmente que aún no existen en el servidor.
  final serverIds = server.map((t) => t.id).toSet();
  for (final l in local) {
    if (!serverIds.contains(l.id) && pendingTaskIds.contains(l.id)) {
      result.add(l);
    }
  }

  return result;
}

/// true si [a] es estrictamente más reciente que [b] (ISO-8601 comparables).
bool _isNewer(String? a, String? b) {
  if (a == null || a.isEmpty) return false;
  if (b == null || b.isEmpty) return true;
  final da = DateTime.tryParse(a);
  final db = DateTime.tryParse(b);
  if (da == null || db == null) return false;
  return da.isAfter(db);
}
