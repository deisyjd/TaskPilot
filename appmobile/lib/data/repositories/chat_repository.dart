import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/conversation.dart';
import '../models/message.dart';

/// Acceso al chat: conversaciones, mensajes, envío y marcar como leído.
class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  Future<List<Conversation>> conversations() async {
    final res = await _api.get<List<dynamic>>('/api/conversations');
    return (res.data ?? [])
        .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Message>> messages(String conversationId) async {
    final res = await _api.get<List<dynamic>>('/api/conversations/$conversationId/messages');
    return (res.data ?? [])
        .map((e) => Message.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Message> sendMessage(
    String conversationId, {
    String content = '',
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/api/conversations/$conversationId/messages',
      data: {
        'content': content,
        if (attachments.isNotEmpty) 'attachments': attachments,
      },
    );
    return Message.fromJson(res.data!);
  }

  /// Sube un archivo a /api/uploads y devuelve el objeto guardado
  /// ({url, name, size, type}) listo para adjuntar a un mensaje.
  Future<Map<String, dynamic>> uploadFile(String filePath, String filename) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: filename),
    });
    final res = await _api.upload<Map<String, dynamic>>('/api/uploads', form);
    return res.data!;
  }

  Future<void> markRead(String conversationId) async {
    await _api.post<Map<String, dynamic>>('/api/conversations/$conversationId/read');
  }
}
