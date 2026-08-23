import 'dart:convert';

import '../../core/network/api_client.dart';

/// Cliente de Server-Sent Events (F4). Consume /api/events/stream y emite los
/// eventos ya parseados (cada evento trae `kind`, `conversationId`, `message`).
class RealtimeService {
  RealtimeService(this._api);

  final ApiClient _api;

  Stream<Map<String, dynamic>> events() async* {
    final bytes = await _api.stream('/api/events/stream');
    final lines = bytes.transform(utf8.decoder).transform(const LineSplitter());
    final data = StringBuffer();

    await for (final line in lines) {
      if (line.isEmpty) {
        // Línea en blanco = fin de un evento SSE.
        if (data.isNotEmpty) {
          try {
            yield jsonDecode(data.toString()) as Map<String, dynamic>;
          } catch (_) {
            // evento no-JSON (p. ej. comentarios): se ignora
          }
          data.clear();
        }
        continue;
      }
      if (line.startsWith('data:')) {
        data.write(line.substring(5).trim());
      }
      // Se ignoran las líneas `event:` (el kind ya viene en el JSON) y los
      // comentarios `:` (heartbeats).
    }
  }
}
