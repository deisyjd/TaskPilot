import '../../core/network/api_client.dart';

/// Envío de reportes por correo (POST /api/reports/send).
class ReportsRepository {
  ReportsRepository(this._api);

  final ApiClient _api;

  /// Envía el reporte de la empresa activa por correo. [formats] admite
  /// 'mailing' (cuerpo del correo), 'pdf' y 'excel' (adjuntos).
  /// Devuelve el total de tareas incluidas en el reporte.
  Future<int> send({
    required String start,
    required String end,
    required List<String> emails,
    List<String> formats = const ['mailing'],
    List<String> projectIds = const [],
  }) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/api/reports/send',
      data: {
        'scope': 'company',
        'start': start,
        'end': end,
        'emails': emails,
        'formats': formats,
        // Vacío = todos los proyectos; con ids = solo esos.
        if (projectIds.isNotEmpty) 'projectIds': projectIds,
      },
    );
    return (res.data?['tasks'] as num?)?.toInt() ?? 0;
  }
}
