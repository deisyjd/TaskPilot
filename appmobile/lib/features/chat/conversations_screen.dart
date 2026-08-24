import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/conversation.dart';
import '../../data/models/message.dart';
import 'chat_providers.dart';

/// Lista de conversaciones (diseño Wipli): header negro + buscador + filas con
/// avatar cuadrado. Se refresca en vivo cuando llega un mensaje (SSE).
class ConversationsScreen extends ConsumerStatefulWidget {
  const ConversationsScreen({super.key});

  @override
  ConsumerState<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends ConsumerState<ConversationsScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(conversationsProvider);

    ref.listen<AsyncValue<Message>>(realtimeMessagesProvider, (_, __) {
      ref.invalidate(conversationsProvider);
    });

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.lime,
          onRefresh: () => ref.refresh(conversationsProvider.future),
          child: async.when(
            loading: () => const LoadingView(),
            error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(conversationsProvider)),
            data: (all) {
              final conversations = _query.isEmpty
                  ? all
                  : all.where((c) => c.name.toLowerCase().contains(_query.toLowerCase())).toList();
              return ListView(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 96),
                children: [
                  _Header(onSearch: (v) => setState(() => _query = v)),
                  const SizedBox(height: 14),
                  if (all.isEmpty)
                    const _EmptyChatCard()
                  else if (conversations.isEmpty)
                    const EmptyView(icon: Icons.search_off, message: 'Sin resultados', scrollable: false)
                  else
                    for (final c in conversations) _ConversationRow(conversation: c),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onSearch});
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Chat', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          TextField(
            onChanged: onSearch,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Buscar conversación…',
              hintStyle: const TextStyle(color: Colors.white38),
              prefixIcon: const Icon(Icons.search, color: Colors.white38, size: 20),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.08),
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(99),
                borderSide: const BorderSide(color: AppColors.lime, width: 1.2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ConversationRow extends StatelessWidget {
  const _ConversationRow({required this.conversation});
  final Conversation conversation;

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final c = conversation;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => context.push('/chat/${c.id}', extra: c),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: context.colors.border),
            ),
            child: Row(
              children: [
                if (c.isGroup)
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: context.colors.surfaceAlt,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(Icons.group, color: context.colors.textSecondary),
                  )
                else
                  UserAvatar(initials: _initials(c.name), size: 46),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      if (c.lastMessagePreview != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          c.lastMessagePreview!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: context.colors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ],
                  ),
                ),
                if (c.unreadCount > 0)
                  Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.all(6),
                    constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                    decoration: const BoxDecoration(color: AppColors.lime, shape: BoxShape.circle),
                    child: Text(
                      '${c.unreadCount}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.ink, fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Estado vacío tipo CTA del mockup ("Habla donde pasa el trabajo").
class _EmptyChatCard extends StatelessWidget {
  const _EmptyChatCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 40),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.colors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.forum_rounded, color: AppColors.ink),
          ),
          const SizedBox(height: 14),
          const Text(
            'Habla donde pasa el trabajo',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Aún no tienes conversaciones. Empieza una desde la web o invita a tu equipo.',
            textAlign: TextAlign.center,
            style: TextStyle(color: context.colors.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
