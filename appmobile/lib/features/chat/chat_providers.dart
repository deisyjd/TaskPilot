import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/conversation.dart';
import '../../data/models/message.dart';
import '../auth/auth_controller.dart';

/// Conversaciones de la empresa activa.
final AutoDisposeFutureProvider<List<Conversation>> conversationsProvider =
    FutureProvider.autoDispose<List<Conversation>>((ref) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(chatRepositoryProvider).conversations();
});

/// Id de la conversación abierta actualmente (para no mostrar toast de un
/// mensaje de la conversación que ya estás viendo). Simple y seguro de setear
/// desde initState/dispose sin tocar `ref`.
String? activeConversationId;

/// Total de mensajes sin leer (suma de todas las conversaciones). Alimenta el
/// badge del ícono de Chat. Se actualiza en vivo porque conversationsProvider
/// se invalida al llegar un mensaje por SSE.
final AutoDisposeProvider<int> unreadCountProvider = Provider.autoDispose<int>((ref) {
  final convs = ref.watch(conversationsProvider).valueOrNull ?? const <Conversation>[];
  return convs.fold<int>(0, (sum, c) => sum + c.unreadCount);
});

/// Flujo de mensajes en tiempo real (SSE). Se reconecta si la conexión cae.
final AutoDisposeStreamProvider<Message> realtimeMessagesProvider =
    StreamProvider.autoDispose<Message>((ref) async* {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  final service = ref.read(realtimeServiceProvider);
  while (true) {
    try {
      await for (final event in service.events()) {
        if (event['kind'] == 'message' && event['message'] is Map) {
          yield Message.fromJson((event['message'] as Map).cast<String, dynamic>());
        }
      }
    } catch (_) {
      // error de conexión → reintenta abajo
    }
    await Future<void>.delayed(const Duration(seconds: 5));
  }
});
