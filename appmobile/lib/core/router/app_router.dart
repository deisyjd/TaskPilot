import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/shell/home_shell.dart';

/// Rutas de la app + redirección según el estado de autenticación.
/// go_router se refresca cuando cambia el AuthState (refreshListenable).
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);
  ref.listen(authControllerProvider, (_, __) => refresh.value++);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loc = state.matchedLocation;

      // Aún resolviendo el auto-login: quédate en el splash.
      if (status == AuthStatus.unknown) {
        return loc == '/splash' ? null : '/splash';
      }

      final loggedIn = status == AuthStatus.authenticated;
      if (!loggedIn) {
        return loc == '/login' ? null : '/login';
      }
      // Autenticado: fuera de las pantallas de auth.
      if (loc == '/login' || loc == '/splash') return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeShell()),
    ],
  );
});
