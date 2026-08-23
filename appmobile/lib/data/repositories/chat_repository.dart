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

  Future<Message> send(String conversationId, String content) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/api/conversations/$conversationId/messages',
      data: {'content': content},
    );
    return Message.fromJson(res.data!);
  }

  Future<void> markRead(String conversationId) async {
    await _api.post<Map<String, dynamic>>('/api/conversations/$conversationId/read');
  }
}
