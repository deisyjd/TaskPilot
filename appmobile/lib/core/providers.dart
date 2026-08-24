import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/offline/outbox.dart';
import '../data/offline/task_cache.dart';
import '../data/offline/task_mutations.dart';
import '../data/realtime/realtime_service.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/chat_repository.dart';
import '../data/repositories/notes_repository.dart';
import '../data/repositories/projects_repository.dart';
import '../data/repositories/reminders_repository.dart';
import '../data/repositories/reports_repository.dart';
import '../data/repositories/tasks_repository.dart';
import '../data/repositories/users_repository.dart';
import '../features/auth/auth_controller.dart';
import '../features/system/connectivity.dart';
import 'network/api_client.dart';
import 'network/session_manager.dart';
import 'storage/local_db.dart';
import 'storage/secure_store.dart';

/// Providers base (infraestructura). Los providers de estado de features viven
/// junto a cada feature (p. ej. authControllerProvider).
///
/// Nota: apiClientProvider ↔ authControllerProvider ↔ authRepositoryProvider se
/// referencian en cadena (el 401 vuelve a auth). Por eso las variables llevan
/// tipo explícito: rompe el ciclo de inferencia de tipos de nivel superior.

final Provider<SecureStore> secureStoreProvider =
    Provider<SecureStore>((ref) => SecureStore());

final Provider<SessionManager> sessionManagerProvider =
    Provider<SessionManager>((ref) => SessionManager(ref.read(secureStoreProvider)));

/// Cliente HTTP. Ante un 401 delega en el AuthController para volver a login.
final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final session = ref.read(sessionManagerProvider);
  return ApiClient(
    session,
    onUnauthorized: () async {
      await ref.read(authControllerProvider.notifier).onUnauthorized();
    },
  );
});

final Provider<AuthRepository> authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider), ref.read(sessionManagerProvider)),
);

final Provider<ProjectsRepository> projectsRepositoryProvider =
    Provider<ProjectsRepository>((ref) => ProjectsRepository(ref.read(apiClientProvider)));

final Provider<TasksRepository> tasksRepositoryProvider =
    Provider<TasksRepository>((ref) => TasksRepository(ref.read(apiClientProvider)));

final Provider<UsersRepository> usersRepositoryProvider =
    Provider<UsersRepository>((ref) => UsersRepository(ref.read(apiClientProvider)));

final Provider<NotesRepository> notesRepositoryProvider =
    Provider<NotesRepository>((ref) => NotesRepository(ref.read(apiClientProvider)));

final Provider<RemindersRepository> remindersRepositoryProvider =
    Provider<RemindersRepository>((ref) => RemindersRepository(ref.read(apiClientProvider)));

final Provider<ChatRepository> chatRepositoryProvider =
    Provider<ChatRepository>((ref) => ChatRepository(ref.read(apiClientProvider)));

final Provider<RealtimeService> realtimeServiceProvider =
    Provider<RealtimeService>((ref) => RealtimeService(ref.read(sessionManagerProvider)));

final Provider<ReportsRepository> reportsRepositoryProvider =
    Provider<ReportsRepository>((ref) => ReportsRepository(ref.read(apiClientProvider)));

// ─── Offline (F2b) ────────────────────────────────────────────────
final Provider<LocalDb> localDbProvider = Provider<LocalDb>((ref) => LocalDb.instance);

final Provider<TaskCache> taskCacheProvider =
    Provider<TaskCache>((ref) => TaskCache(ref.read(localDbProvider)));

final Provider<OutboxStore> outboxProvider =
    Provider<OutboxStore>((ref) => OutboxStore(ref.read(localDbProvider)));

final Provider<TaskMutations> taskMutationsProvider = Provider<TaskMutations>(
  (ref) => TaskMutations(
    ref.read(tasksRepositoryProvider),
    ref.read(taskCacheProvider),
    ref.read(outboxProvider),
    ref.read(connectivityServiceProvider),
  ),
);
