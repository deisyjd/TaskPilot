import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/session_manager.dart';
import '../../core/providers.dart';
import '../../data/models/session.dart';
import '../../data/repositories/auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// Estado global de autenticación.
class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.session,
    this.submitting = false,
    this.error,
  });

  final AuthStatus status;
  final Session? session;
  final bool submitting; // login/switch en curso (para spinners)
  final String? error;

  AuthState copyWith({
    AuthStatus? status,
    Object? session = _sentinel,
    bool? submitting,
    Object? error = _sentinel,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: identical(session, _sentinel) ? this.session : session as Session?,
      submitting: submitting ?? this.submitting,
      error: identical(error, _sentinel) ? this.error : error as String?,
    );
  }

  static const _sentinel = Object();
}

/// Orquesta login, auto-login, cambio de empresa y logout.
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repo, this._session) : super(const AuthState());

  final AuthRepository _repo;
  final SessionManager _session;

  /// Auto-login: restaura credenciales y valida contra /api/auth/me.
  Future<void> bootstrap() async {
    await _session.restore();
    final session = await _repo.me();
    if (session != null) {
      state = state.copyWith(status: AuthStatus.authenticated, session: session, error: null);
    } else {
      await _session.clear();
      state = state.copyWith(status: AuthStatus.unauthenticated, session: null);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(submitting: true, error: null);
    try {
      final session = await _repo.login(email: email.trim(), password: password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        session: session,
        submitting: false,
        error: null,
      );
    } on ApiException catch (e) {
      state = state.copyWith(submitting: false, error: e.message);
    } catch (_) {
      state = state.copyWith(submitting: false, error: 'No se pudo iniciar sesión.');
    }
  }

  /// Login con Google (SDK nativo → idToken → POST /api/auth/google/mobile).
  Future<void> signInWithGoogle() async {
    if (AppConfig.googleServerClientId.isEmpty) {
      state = state.copyWith(
        error: 'Google no está configurado en la app (falta GOOGLE_SERVER_CLIENT_ID).',
      );
      return;
    }
    state = state.copyWith(submitting: true, error: null);
    try {
      final signIn = GoogleSignIn(
        serverClientId: AppConfig.googleServerClientId,
        scopes: const ['email'],
      );
      // Cierra cualquier sesión previa para forzar el selector de cuenta.
      await signIn.signOut();
      final account = await signIn.signIn();
      if (account == null) {
        // El usuario canceló el selector.
        state = state.copyWith(submitting: false);
        return;
      }
      final tokens = await account.authentication;
      final idToken = tokens.idToken;
      if (idToken == null || idToken.isEmpty) {
        state = state.copyWith(submitting: false, error: 'No se pudo obtener el token de Google.');
        return;
      }
      final session = await _repo.loginWithGoogle(idToken);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        session: session,
        submitting: false,
        error: null,
      );
    } on ApiException catch (e) {
      state = state.copyWith(submitting: false, error: e.message);
    } catch (_) {
      state = state.copyWith(submitting: false, error: 'No se pudo iniciar con Google.');
    }
  }

  Future<void> switchCompany(String companyId) async {
    if (state.session?.activeCompanyId == companyId) return;
    state = state.copyWith(submitting: true, error: null);
    try {
      await _repo.switchCompany(companyId);
      final refreshed = await _repo.me();
      state = state.copyWith(
        session: refreshed ?? state.session?.copyWith(activeCompanyId: companyId),
        submitting: false,
      );
    } on ApiException catch (e) {
      state = state.copyWith(submitting: false, error: e.message);
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = state.copyWith(status: AuthStatus.unauthenticated, session: null, error: null);
  }

  /// Llamado por el ApiClient cuando el server responde 401.
  Future<void> onUnauthorized() async {
    await _session.clear();
    state = state.copyWith(status: AuthStatus.unauthenticated, session: null);
  }

  void clearError() => state = state.copyWith(error: null);
}

final StateNotifierProvider<AuthController, AuthState> authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref.read(authRepositoryProvider),
    ref.read(sessionManagerProvider),
  );
});
