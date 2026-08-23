import 'package:dio/dio.dart';

/// Error normalizado del API. La UI muestra `message` directamente.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.isNetwork = false});

  final String message;
  final int? statusCode;
  final bool isNetwork;

  bool get isUnauthorized => statusCode == 401;

  /// Construye una excepción legible a partir de un [DioException].
  factory ApiException.fromDio(DioException e) {
    // Sin conexión / timeout: caso relevante para el modo offline (F2b).
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('La conexión tardó demasiado. Reintenta.', isNetwork: true);
      case DioExceptionType.connectionError:
        return ApiException('Sin conexión a internet.', isNetwork: true);
      default:
        break;
    }

    final status = e.response?.statusCode;
    final data = e.response?.data;
    String? serverMessage;
    if (data is Map && data['error'] is String) {
      serverMessage = data['error'] as String;
    }
    return ApiException(
      serverMessage ?? 'Ocurrió un error (${status ?? 'desconocido'}).',
      statusCode: status,
    );
  }

  @override
  String toString() => message;
}
