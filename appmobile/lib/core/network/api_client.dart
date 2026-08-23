import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_exception.dart';
import 'session_manager.dart';

/// Cliente HTTP central (dio) con:
/// - inyección de la cookie de sesión / bearer en cada request,
/// - captura del `set-cookie` de las respuestas de login para persistir sesión,
/// - manejo de 401 (dispara [onUnauthorized] para que la app vuelva a login).
class ApiClient {
  ApiClient(this._session, {this.onUnauthorized}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        contentType: 'application/json',
        // No lanzar por 4xx: lo normalizamos nosotros en el catch.
        validateStatus: (code) => code != null && code < 500,
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final cookie = _session.sessionCookie;
          if (cookie != null && cookie.isNotEmpty) {
            options.headers['Cookie'] = 'wipli-session=$cookie';
          }
          final bearer = _session.bearerToken;
          if (bearer != null && bearer.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $bearer';
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          _captureSessionCookie(response);
          handler.next(response);
        },
      ),
    );
  }

  late final Dio _dio;
  final SessionManager _session;

  /// Callback disparado cuando el servidor responde 401 (sesión inválida).
  final Future<void> Function()? onUnauthorized;

  Dio get raw => _dio;

  /// Extrae `wipli-session=<valor>` del header set-cookie y lo persiste.
  void _captureSessionCookie(Response<dynamic> response) {
    final setCookies = response.headers.map['set-cookie'];
    if (setCookies == null) return;
    for (final raw in setCookies) {
      final first = raw.split(';').first.trim();
      final eq = first.indexOf('=');
      if (eq <= 0) continue;
      final name = first.substring(0, eq);
      final value = first.substring(eq + 1);
      if (name == 'wipli-session' && value.isNotEmpty && value != 'deleted') {
        _session.setSessionCookie(value);
      }
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _guard(() => _dio.get<T>(path, queryParameters: query));

  Future<Response<T>> post<T>(String path, {Object? data}) =>
      _guard(() => _dio.post<T>(path, data: data));

  Future<Response<T>> patch<T>(String path, {Object? data}) =>
      _guard(() => _dio.patch<T>(path, data: data));

  Future<Response<T>> delete<T>(String path, {Object? data}) =>
      _guard(() => _dio.delete<T>(path, data: data));

  /// Ejecuta la request y traduce errores a [ApiException]. Un 401 limpia la
  /// sesión y avisa a la app.
  Future<Response<T>> _guard<T>(Future<Response<T>> Function() run) async {
    try {
      final res = await run();
      if (res.statusCode == 401) {
        await onUnauthorized?.call();
        throw ApiException('Tu sesión expiró. Inicia sesión de nuevo.', statusCode: 401);
      }
      if (res.statusCode != null && res.statusCode! >= 400) {
        final data = res.data;
        final msg = data is Map && data['error'] is String
            ? data['error'] as String
            : 'Error ${res.statusCode}';
        throw ApiException(msg, statusCode: res.statusCode);
      }
      return res;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
