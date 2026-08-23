import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/user.dart';
import '../auth/auth_controller.dart';

/// Miembros de la empresa activa. Se recarga al cambiar de empresa.
final AutoDisposeFutureProvider<List<User>> usersProvider =
    FutureProvider.autoDispose<List<User>>((ref) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(usersRepositoryProvider).list();
});

/// Mapa id → User para resolver responsables sin recorrer la lista cada vez.
final AutoDisposeProvider<Map<String, User>> usersByIdProvider =
    Provider.autoDispose<Map<String, User>>((ref) {
  final users = ref.watch(usersProvider).valueOrNull ?? const [];
  return {for (final u in users) u.id: u};
});
