import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../../data/offline/sync_merge.dart';
import '../auth/auth_controller.dart';
import '../system/connectivity.dart';

/// Tareas de la empresa activa, **offline-first / cache-first** (F2b):
/// - Devuelve SIEMPRE primero la caché local (instantáneo, funciona offline).
/// - Si hay conexión, refresca en segundo plano: baja del servidor, fusiona
///   con los cambios locales pendientes (última escritura gana), guarda en la
///   caché y emite el resultado.
/// Fuente única para dashboard, tablero Kanban, timeline y detalle de proyecto.
class CompanyTasksNotifier extends AutoDisposeAsyncNotifier<List<Task>> {
  bool _disposed = false;

  @override
  Future<List<Task>> build() async {
    ref.onDispose(() => _disposed = true);
    final companyId = ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
    if (companyId == null) return const [];

    final cached = await ref.read(taskCacheProvider).byCompany(companyId);
    // Refresco de red en segundo plano (no bloquea la lectura local).
    unawaited(_refresh(companyId));
    return cached;
  }

  Future<void> _refresh(String companyId) async {
    final online = await ref.read(connectivityServiceProvider).isOnline();
    if (!online) return;
    try {
      final fresh = await ref.read(tasksRepositoryProvider).list();
      final pending = await ref.read(outboxProvider).pendingTaskIds();
      final local = await ref.read(taskCacheProvider).byCompany(companyId);
      final merged = mergeTasks(server: fresh, local: local, pendingTaskIds: pending);
      await ref.read(taskCacheProvider).replaceCompany(companyId, merged);
      if (!_disposed) state = AsyncData(merged);
    } catch (_) {
      // Sin red o error: nos quedamos con lo que ya se emitió desde la caché.
    }
  }
}

final AutoDisposeAsyncNotifierProvider<CompanyTasksNotifier, List<Task>> companyTasksProvider =
    AutoDisposeAsyncNotifierProvider<CompanyTasksNotifier, List<Task>>(CompanyTasksNotifier.new);
