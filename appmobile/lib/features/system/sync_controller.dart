import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../tasks/tasks_providers.dart';
import 'connectivity.dart';

/// Estado de sincronización para el indicador de la UI.
class SyncState {
  const SyncState({this.online = true, this.pending = 0, this.syncing = false});

  final bool online;
  final int pending; // operaciones en el outbox
  final bool syncing;

  SyncState copyWith({bool? online, int? pending, bool? syncing}) => SyncState(
        online: online ?? this.online,
        pending: pending ?? this.pending,
        syncing: syncing ?? this.syncing,
      );
}

/// Orquesta el outbox: refresca el contador, sube los cambios pendientes y
/// auto-sincroniza cuando vuelve la conexión (F2b).
class SyncController extends StateNotifier<SyncState> {
  SyncController(this._ref) : super(const SyncState()) {
    _init();
  }

  final Ref _ref;

  Future<void> _init() async {
    final online = await _ref.read(connectivityServiceProvider).isOnline();
    final pending = await _ref.read(outboxProvider).count();
    if (mounted) state = state.copyWith(online: online, pending: pending);

    // Auto-sync al recuperar internet.
    _ref.listen<AsyncValue<bool>>(onlineStatusProvider, (_, next) {
      next.whenData((isOnline) {
        if (mounted) state = state.copyWith(online: isOnline);
        if (isOnline) flush();
      });
    });

    if (online && pending > 0) flush();
  }

  Future<void> refreshPending() async {
    final pending = await _ref.read(outboxProvider).count();
    if (mounted) state = state.copyWith(pending: pending);
  }

  /// Sube las operaciones del outbox en orden. Corta al primer fallo y reintenta
  /// en el próximo disparo (conexión recuperada / nueva mutación).
  Future<void> flush() async {
    if (state.syncing) return;
    final outbox = _ref.read(outboxProvider);
    final ops = await outbox.all();
    if (ops.isEmpty) {
      await refreshPending();
      return;
    }
    if (mounted) state = state.copyWith(syncing: true);
    final repo = _ref.read(tasksRepositoryProvider);
    for (final op in ops) {
      try {
        await repo.update(op.taskId, op.payload);
        await outbox.remove(op.id);
      } catch (_) {
        break;
      }
    }
    if (mounted) state = state.copyWith(syncing: false);
    await refreshPending();
    _ref.invalidate(companyTasksProvider);
  }
}

final StateNotifierProvider<SyncController, SyncState> syncControllerProvider =
    StateNotifierProvider<SyncController, SyncState>((ref) => SyncController(ref));
