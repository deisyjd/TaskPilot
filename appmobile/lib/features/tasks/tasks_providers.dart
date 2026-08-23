import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../../data/offline/sync_merge.dart';
import '../auth/auth_controller.dart';
import '../system/connectivity.dart';

/// Todas las tareas de la empresa activa, **offline-first** (F2b):
/// - Sin conexión: devuelve la caché local (instantáneo, funciona offline).
/// - Con conexión: baja del servidor, fusiona con los cambios locales
///   pendientes (última escritura gana) y actualiza la caché.
/// Fuente única para dashboard, tablero Kanban, línea de tiempo y detalle
/// de proyecto.
final AutoDisposeFutureProvider<List<Task>> companyTasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  final companyId = ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  if (companyId == null) return const [];

  final cache = ref.read(taskCacheProvider);
  final online = await ref.read(connectivityServiceProvider).isOnline();

  if (!online) {
    return cache.byCompany(companyId);
  }

  try {
    final fresh = await ref.read(tasksRepositoryProvider).list();
    final pending = await ref.read(outboxProvider).pendingTaskIds();
    final local = await cache.byCompany(companyId);
    final merged = mergeTasks(server: fresh, local: local, pendingTaskIds: pending);
    await cache.replaceCompany(companyId, merged);
    return merged;
  } catch (_) {
    // Falla de red aunque haya conexión: cae a la caché.
    return cache.byCompany(companyId);
  }
});
