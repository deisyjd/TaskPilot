import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/conversation.dart';
import '../../data/models/message.dart';
import 'chat_providers.dart';

/// Lista de conversaciones. Se refresca en vivo cuando llega un mensaje (SSE).
class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider);

    // Al llegar un mensaje por SSE, refresca previews/no leídos.
    ref.listen<AsyncValue<Message>>(realtimeMessagesProvider, (_, __) {
      ref.invalidate(conversationsProvider);
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () => ref.refresh(conversationsProvider.future),
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(conversationsProvider)),
          data: (conversations) {
            if (conversations.isEmpty) {
              return const EmptyView(icon: Icons.forum_outlined, message: 'Sin conversaciones');
            }
            return ListView.separated(
              itemCount: conversations.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
              itemBuilder: (_, i) => _ConversationTile(conversation: conversations[i]),
            );
          },
        ),
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});
  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final c = conversation;
    return ListTile(
      onTap: () => context.push('/chat/${c.id}', extra: c),
      leading: c.isGroup
          ? CircleAvatar(
              backgroundColor: context.colors.surfaceAlt,
              child: Icon(Icons.group, color: context.colors.textSecondary),
            )
          : UserAvatar(initials: _initials(c.name), seed: c.name, size: 44),
      title: Text(
        c.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: c.lastMessagePreview != null
          ? Text(
              c.lastMessagePreview!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: context.colors.textSecondary),
            )
          : null,
      trailing: c.unreadCount > 0
          ? Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(color: AppColors.lime, shape: BoxShape.circle),
              constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
              child: Text(
                '${c.unreadCount}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.ink, fontSize: 11, fontWeight: FontWeight.w700),
              ),
            )
          : null,
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first).toUpperCase();
  }
}
