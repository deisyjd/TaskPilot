import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';

/// Todas las tareas de la empresa activa. Se recarga al cambiar de empresa.
/// Fuente única para dashboard, tablero Kanban y línea de tiempo.
final AutoDisposeFutureProvider<List<Task>> companyTasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(tasksRepositoryProvider).list();
});
