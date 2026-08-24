import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

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
          if (kDebugMode) {
            debugPrint(
              '[api] → ${options.method} ${options.uri} '
              'cookie=${options.headers.containsKey('Cookie')} '
              'bearer=${options.headers.containsKey('Authorization')}',
            );
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          final hadSetCookie = response.headers.map['set-cookie'] != null;
          _captureSessionCookie(response);
          if (kDebugMode) {
            debugPrint(
              '[api] ← ${response.statusCode} ${response.requestOptions.uri} '
              'set-cookie=$hadSetCookie captured=${_session.sessionCookie != null}',
            );
          }
          handler.next(response);
        },
        onError: (e, handler) {
          if (kDebugMode) {
            debugPrint('[api] ✕ ${e.type} ${e.requestOptions.uri} :: ${e.message}');
          }
          handler.next(e);
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

  /// Abre una conexión de streaming (Server-Sent Events). No pasa por [_guard]
  /// porque es de larga duración; la sesión se adjunta por el interceptor.
  Future<Stream<List<int>>> stream(String path) async {
    final res = await _dio.get<ResponseBody>(
      path,
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Accept': 'text/event-stream'},
      ),
    );
    return res.data!.stream;
  }

  Future<Response<T>> post<T>(String path, {Object? data}) =>
      _guard(() => _dio.post<T>(path, data: data));

  /// Subida multipart (dio calcula el boundary a partir del [FormData]).
  /// [onSendProgress] recibe (bytesEnviados, bytesTotales) para pintar progreso.
  Future<Response<T>> upload<T>(
    String path,
    FormData form, {
    ProgressCallback? onSendProgress,
  }) =>
      _guard(
        () => _dio.post<T>(
          path,
          data: form,
          options: Options(contentType: 'multipart/form-data'),
          onSendProgress: onSendProgress,
        ),
      );

  Future<Response<T>> patch<T>(String path, {Object? data}) =>
      _guard(() => _dio.patch<T>(path, data: data));

  Future<Response<T>> delete<T>(String path, {Object? data}) =>
      _guard(() => _dio.delete<T>(path, data: data));

  /// Ejecuta la request y traduce errores a [ApiException]. Un 401 limpia la
  /// sesión y avisa a la app.
  Future<Response<T>> _guard<T>(Future<Response<T>> Function() run) async {
    try {
      final res = await run();
      if (res.statusCode != null && res.statusCode! >= 400) {
        final data = res.data;
        final serverMsg =
            data is Map && data['error'] is String ? data['error'] as String : null;
        // Solo tratamos el 401 como "sesión expirada" (limpiar + volver a login)
        // cuando YA había una sesión. Un 401 del propio login son credenciales
        // inválidas, no una expiración.
        if (res.statusCode == 401 && _session.isAuthenticated) {
          await onUnauthorized?.call();
        }
        throw ApiException(
          serverMsg ?? 'Error ${res.statusCode}',
          statusCode: res.statusCode,
        );
      }
      return res;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
