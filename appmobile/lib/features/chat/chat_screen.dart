import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pdfx/pdfx.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
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
  double? _uploadProgress; // null = sin subida en curso; 0..1 mientras sube

  String get _titleInitials {
    final parts = widget.conversation.name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first).toUpperCase();
  }

  @override
  void initState() {
    super.initState();
    activeConversationId = widget.conversation.id;
    _load();
  }

  @override
  void dispose() {
    if (activeConversationId == widget.conversation.id) activeConversationId = null;
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
    setState(() {
      _sending = true;
      _uploadProgress = 0;
    });
    try {
      final saved = await ref.read(chatRepositoryProvider).uploadFile(
        file.path,
        file.name,
        onProgress: (sent, total) {
          if (!mounted || total <= 0) return;
          setState(() => _uploadProgress = (sent / total).clamp(0.0, 1.0));
        },
      );
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
      if (mounted) {
        setState(() {
          _sending = false;
          _uploadProgress = null;
        });
      }
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

  /// Con la lista invertida (reverse:true), el "fondo" (último mensaje) es el
  /// offset 0. Al cargar ya arranca ahí; al enviar/recibir animamos a 0.
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          0,
          duration: const Duration(milliseconds: 250),
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

    String? headerImageUrl;
    if (!widget.conversation.isGroup) {
      final others = widget.conversation.members.where((m) => m != myId);
      final otherId = others.isNotEmpty
          ? others.first
          : (widget.conversation.members.isNotEmpty ? widget.conversation.members.first : null);
      headerImageUrl = otherId == null ? null : usersById[otherId]?.avatarUrl;
    }

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            widget.conversation.isGroup
                ? Container(
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: context.colors.surfaceAlt,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.group, size: 18, color: context.colors.textSecondary),
                  )
                : UserAvatar(initials: _titleInitials, size: 34, imageUrl: headerImageUrl),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.conversation.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
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
          child: Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: context.colors.textSecondary)),
        ),
      );
    }
    if (_messages.isEmpty) {
      return Center(child: Text('Aún no hay mensajes', style: TextStyle(color: context.colors.textSecondary)));
    }
    return ListView.builder(
      controller: _scroll,
      reverse: true, // el último mensaje queda siempre abajo y visible
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (_, i) {
        final m = _messages[_messages.length - 1 - i];
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
        decoration: BoxDecoration(
          color: context.colors.surface,
          border: Border(top: BorderSide(color: context.colors.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_uploadProgress != null) _uploadBar(),
            Row(
              children: [
                IconButton(
                  tooltip: 'Adjuntar imagen',
                  onPressed: _sending ? null : _attach,
                  icon: Icon(Icons.attach_file, color: context.colors.textSecondary),
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
          ],
        ),
      ),
    );
  }

  /// Barra de progreso de subida del adjunto seleccionado en el chat.
  Widget _uploadBar() {
    final pct = ((_uploadProgress ?? 0) * 100).round();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.upload_file, size: 14, color: context.colors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Subiendo adjunto… $pct%',
                  style: TextStyle(fontSize: 12, color: context.colors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _uploadProgress,
              minHeight: 5,
              backgroundColor: context.colors.surfaceAlt,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.lime),
            ),
          ),
        ],
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
          color: mine ? AppColors.lime : context.colors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(mine ? 18 : 6),
            bottomRight: Radius.circular(mine ? 6 : 18),
          ),
          border: mine ? null : Border.all(color: context.colors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (senderName != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  senderName!,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.colors.textMuted),
                ),
              ),
            for (final a in message.attachments) _attachment(context, a, mine),
            for (final l in message.links) _link(l, mine),
            if (message.text.isNotEmpty)
              Text(
                message.text,
                style: TextStyle(color: mine ? AppColors.ink : context.colors.textPrimary),
              ),
          ],
        ),
      ),
    );
  }

  Widget _attachment(BuildContext context, Attachment a, bool mine) {
    final url = AppConfig.media(a.url);
    void open() => _AttachmentViewer.open(context, a);
    if (a.isImage) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: GestureDetector(
          onTap: open,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              url,
              width: 200,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _fileChip(context, a.name, mine),
            ),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: GestureDetector(
        onTap: open,
        child: _fileChip(context, a.name, mine),
      ),
    );
  }

  Widget _fileChip(BuildContext context, String name, bool mine) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.attach_file, size: 16, color: mine ? AppColors.ink : context.colors.textSecondary),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: mine ? AppColors.ink : context.colors.textSecondary),
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

/// Visor a pantalla completa (100% del ancho) de un adjunto del chat. Espejo del
/// `AttachmentViewer` del web: imágenes y PDF se previsualizan (con zoom); el
/// resto muestra el nombre del archivo. Se cierra tocando fuera o con la ✕.
class _AttachmentViewer extends StatefulWidget {
  const _AttachmentViewer({required this.attachment});

  final Attachment attachment;

  static void open(BuildContext context, Attachment attachment) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black.withValues(alpha: 0.92),
        barrierDismissible: true,
        pageBuilder: (_, __, ___) => _AttachmentViewer(attachment: attachment),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  @override
  State<_AttachmentViewer> createState() => _AttachmentViewerState();
}

class _AttachmentViewerState extends State<_AttachmentViewer> {
  PdfControllerPinch? _pdf;

  @override
  void initState() {
    super.initState();
    final a = widget.attachment;
    if (a.isPdf) {
      _pdf = PdfControllerPinch(
        document: PdfDocument.openData(_fetchBytes(AppConfig.media(a.url))),
      );
    }
  }

  @override
  void dispose() {
    _pdf?.dispose();
    super.dispose();
  }

  /// Abre el adjunto en una app externa / navegador (permite descargarlo).
  Future<void> _openExternally() async {
    final uri = Uri.parse(AppConfig.media(widget.attachment.url));
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el archivo')),
      );
    }
  }

  /// Descarga los bytes del adjunto (los uploads son públicos, igual que
  /// `Image.network`) para alimentar el documento de pdfx.
  Future<Uint8List> _fetchBytes(String url) async {
    final res = await Dio().get<List<int>>(
      url,
      options: Options(responseType: ResponseType.bytes),
    );
    return Uint8List.fromList(res.data ?? const []);
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.attachment;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            // Barra superior: nombre + cerrar.
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      a.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Descargar / abrir',
                    onPressed: _openExternally,
                    icon: const Icon(Icons.download_rounded, color: Colors.white),
                  ),
                  IconButton(
                    tooltip: 'Cerrar',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),
            // Contenido: ocupa el 100% del ancho disponible.
            Expanded(child: _content(a)),
          ],
        ),
      ),
    );
  }

  Widget _content(Attachment a) {
    final url = AppConfig.media(a.url);
    if (a.isImage) {
      return GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: SizedBox(
          width: double.infinity,
          child: InteractiveViewer(
            minScale: 1,
            maxScale: 5,
            child: Image.network(
              url,
              width: double.infinity,
              fit: BoxFit.contain,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                final total = progress.expectedTotalBytes;
                return Center(
                  child: CircularProgressIndicator(
                    color: AppColors.lime,
                    value: total != null
                        ? progress.cumulativeBytesLoaded / total
                        : null,
                  ),
                );
              },
              errorBuilder: (_, __, ___) => _fileFallback(),
            ),
          ),
        ),
      );
    }
    if (a.isPdf && _pdf != null) {
      // El PDF se desliza/zooma; no envolvemos en tap-para-cerrar (usar la ✕).
      return PdfViewPinch(
        controller: _pdf!,
        builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
          options: const DefaultBuilderOptions(),
          documentLoaderBuilder: (_) =>
              const Center(child: CircularProgressIndicator(color: AppColors.lime)),
          pageLoaderBuilder: (_) =>
              const Center(child: CircularProgressIndicator(color: AppColors.lime)),
          errorBuilder: (_, __) => _fileFallback(),
        ),
      );
    }
    return GestureDetector(
      onTap: () => Navigator.of(context).pop(),
      child: SizedBox(width: double.infinity, child: _fileFallback()),
    );
  }

  Widget _fileFallback() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.insert_drive_file_outlined, size: 72, color: Colors.white70),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              widget.attachment.name,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'No hay vista previa para este archivo.',
            style: TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
