import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/conversation.dart';
import '../../data/models/message.dart';
import '../../data/models/user.dart';
import '../auth/auth_controller.dart';
import '../users/users_providers.dart';
import 'chat_providers.dart';

/// Ventana de chat: mensajes de una conversación con actualización en vivo (SSE).
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.conversation});

  final Conversation conversation;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messages = <Message>[];
  final _seen = <String>{};
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final msgs = await ref.read(chatRepositoryProvider).messages(widget.conversation.id);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(msgs);
        _seen
          ..clear()
          ..addAll(msgs.map((m) => m.id));
        _loading = false;
      });
      _scrollToBottom();
      await ref.read(chatRepositoryProvider).markRead(widget.conversation.id);
      ref.invalidate(conversationsProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  void _appendRealtime(Message m) {
    if (m.conversationId != widget.conversation.id || _seen.contains(m.id)) return;
    setState(() {
      _messages.add(m);
      _seen.add(m.id);
    });
    _scrollToBottom();
    ref.read(chatRepositoryProvider).markRead(widget.conversation.id);
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final msg = await ref.read(chatRepositoryProvider).sendMessage(
            widget.conversation.id,
            content: text,
          );
      _input.clear();
      _appendSent(msg);
      ref.invalidate(conversationsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _attach() async {
    if (_sending) return;
    final XFile? file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null) return;
    setState(() => _sending = true);
    try {
      final saved = await ref.read(chatRepositoryProvider).uploadFile(file.path, file.name);
      final msg = await ref.read(chatRepositoryProvider).sendMessage(
            widget.conversation.id,
            content: _input.text.trim(),
            attachments: [saved],
          );
      _input.clear();
      _appendSent(msg);
      ref.invalidate(conversationsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _appendSent(Message msg) {
    if (_seen.contains(msg.id)) return;
    setState(() {
      _messages.add(msg);
      _seen.add(msg.id);
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Entrega en vivo de nuevos mensajes.
    ref.listen<AsyncValue<Message>>(realtimeMessagesProvider, (_, next) {
      next.whenData(_appendRealtime);
    });

    final myId = ref.watch(authControllerProvider).session?.user.id;
    final usersById = ref.watch(usersByIdProvider);

    return Scaffold(
      appBar: AppBar(title: Text(widget.conversation.name)),
      body: Column(
        children: [
          Expanded(child: _body(myId, usersById)),
          _composer(),
        ],
      ),
    );
  }

  Widget _body(String? myId, Map<String, User> usersById) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.lime));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
        ),
      );
    }
    if (_messages.isEmpty) {
      return const Center(child: Text('Aún no hay mensajes', style: TextStyle(color: AppColors.textSecondary)));
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (_, i) {
        final m = _messages[i];
        final mine = m.senderId == myId;
        final senderName = widget.conversation.isGroup && !mine
            ? usersById[m.senderId]?.name
            : null;
        return _Bubble(message: m, mine: mine, senderName: senderName);
      },
    );
  }

  Widget _composer() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            IconButton(
              tooltip: 'Adjuntar imagen',
              onPressed: _sending ? null : _attach,
              icon: const Icon(Icons.attach_file, color: AppColors.textSecondary),
            ),
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: 'Escribe un mensaje…',
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.lime,
                foregroundColor: AppColors.ink,
              ),
              icon: _sending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                    )
                  : const Icon(Icons.send),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine, this.senderName});

  final Message message;
  final bool mine;
  final String? senderName;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: mine ? AppColors.lime : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: mine ? null : Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (senderName != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  senderName!,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                ),
              ),
            for (final a in message.attachments) _attachment(a, mine),
            for (final l in message.links) _link(l, mine),
            if (message.text.isNotEmpty)
              Text(
                message.text,
                style: TextStyle(color: mine ? AppColors.ink : AppColors.textPrimary),
              ),
          ],
        ),
      ),
    );
  }

  Widget _attachment(Attachment a, bool mine) {
    final url = AppConfig.media(a.url);
    if (a.isImage) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.network(
            url,
            width: 200,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _fileChip(a.name, mine),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: _fileChip(a.name, mine),
    );
  }

  Widget _fileChip(String name, bool mine) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.attach_file, size: 16, color: mine ? AppColors.ink : AppColors.textSecondary),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: mine ? AppColors.ink : AppColors.textSecondary),
          ),
        ),
      ],
    );
  }

  Widget _link(LinkRef l, bool mine) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.link, size: 16, color: mine ? AppColors.ink : AppColors.statusInProgress),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              l.title ?? l.url,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                color: mine ? AppColors.ink : AppColors.statusInProgress,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
