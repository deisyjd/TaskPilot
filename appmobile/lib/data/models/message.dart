/// Adjunto de un mensaje (o tarea). Forma mínima para mostrar en el chat.
class Attachment {
  const Attachment({required this.name, required this.url, this.type});

  final String name;
  final String url;
  final String? type;

  bool get isImage => (type ?? '').startsWith('image/');

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
        name: json['name'] as String? ?? 'archivo',
        url: json['url'] as String? ?? '',
        type: json['type'] as String?,
      );
}

/// Enlace de referencia adjunto a un mensaje.
class LinkRef {
  const LinkRef({required this.url, this.title});

  final String url;
  final String? title;

  factory LinkRef.fromJson(Map<String, dynamic> json) => LinkRef(
        url: json['url'] as String? ?? '',
        title: json['title'] as String?,
      );
}

/// Mensaje de chat. Espejo de `serializeMessage` del backend (usa `text`).
class Message {
  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.text,
    required this.createdAt,
    this.attachments = const [],
    this.links = const [],
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String text;
  final String createdAt;
  final List<Attachment> attachments;
  final List<LinkRef> links;

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        conversationId: json['conversationId'] as String? ?? '',
        senderId: json['senderId'] as String? ?? '',
        text: json['text'] as String? ?? '',
        createdAt: json['createdAt'] is String
            ? json['createdAt'] as String
            : json['createdAt']?.toString() ?? '',
        attachments: _list(json['attachments'], (e) => Attachment.fromJson(e)),
        links: _list(json['links'], (e) => LinkRef.fromJson(e)),
      );

  static List<T> _list<T>(dynamic value, T Function(Map<String, dynamic>) f) {
    if (value is List) {
      return value
          .whereType<Map<String, dynamic>>()
          .map(f)
          .toList();
    }
    return const [];
  }
}
