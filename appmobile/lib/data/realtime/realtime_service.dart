import 'dart:convert';
import 'dart:io';

import '../../core/config/app_config.dart';
import '../../core/network/session_manager.dart';

/// Cliente de Server-Sent Events (F4). Consume /api/events/stream y emite los
/// eventos ya parseados (cada evento trae `kind`, `conversationId`, `message`).
///
/// Usa el `HttpClient` nativo de dart:io en vez de dio: dio con
/// `ResponseType.stream` cierra la conexión de larga vida (timeouts), lo que
/// hacía que el SSE se reconectara cada pocos segundos sin recibir eventos.
class RealtimeService {
  RealtimeService(this._session);

  final SessionManager _session;

  Stream<Map<String, dynamic>> events() async* {
    final client = HttpClient()..idleTimeout = const Duration(minutes: 5);
    try {
      final req = await client.getUrl(Uri.parse('${AppConfig.apiUrl}/api/events/stream'));
      req.headers.set(HttpHeaders.acceptHeader, 'text/event-stream');
      req.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');

      final cookie = _session.sessionCookie;
      if (cookie != null && cookie.isNotEmpty) {
        req.headers.set(HttpHeaders.cookieHeader, 'wipli-session=$cookie');
      }
      final bearer = _session.bearerToken;
      if (bearer != null && bearer.isNotEmpty) {
        req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $bearer');
      }

      final resp = await req.close();
      if (resp.statusCode != 200) {
        throw HttpException('SSE respondió ${resp.statusCode}');
      }

      final lines = resp.transform(utf8.decoder).transform(const LineSplitter());
      final data = StringBuffer();
      await for (final line in lines) {
        if (line.isEmpty) {
          // Línea en blanco = fin de un evento SSE.
          if (data.isNotEmpty) {
            try {
              yield jsonDecode(data.toString()) as Map<String, dynamic>;
            } catch (_) {
              // evento no-JSON: se ignora
            }
            data.clear();
          }
          continue;
        }
        if (line.startsWith('data:')) {
          data.write(line.substring(5).trim());
        }
        // Se ignoran `event:` (el kind ya viene en el JSON) y comentarios `:`.
      }
    } finally {
      client.close(force: true);
    }
  }
}
