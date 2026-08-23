import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/repositories/auth_repository.dart';
import '../data/repositories/projects_repository.dart';
import '../data/repositories/tasks_repository.dart';
import '../features/auth/auth_controller.dart';
import 'network/api_client.dart';
import 'network/session_manager.dart';
import 'storage/secure_store.dart';

/// Providers base (infraestructura). Los providers de estado de features viven
/// junto a cada feature (p. ej. authControllerProvider).

final secureStoreProvider = Provider<SecureStore>((ref) => SecureStore());

final sessionManagerProvider = Provider<SessionManager>(
  (ref) => SessionManager(ref.read(secureStoreProvider)),
);

/// Cliente HTTP. Ante un 401 delega en el AuthController para volver a login.
final apiClientProvider = Provider<ApiClient>((ref) {
  final session = ref.read(sessionManagerProvider);
  return ApiClient(
    session,
    onUnauthorized: () async {
      await ref.read(authControllerProvider.notifier).onUnauthorized();
    },
  );
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider), ref.read(sessionManagerProvider)),
);

final projectsRepositoryProvider = Provider<ProjectsRepository>(
  (ref) => ProjectsRepository(ref.read(apiClientProvider)),
);

final tasksRepositoryProvider = Provider<TasksRepository>(
  (ref) => TasksRepository(ref.read(apiClientProvider)),
);
