/// Conversación (directa o grupo). Espejo de `serializeConversation`:
/// para directas, `name` ya viene con el nombre de la otra persona.
class Conversation {
  const Conversation({
    required this.id,
    required this.type,
    required this.name,
    required this.members,
    this.coverImageUrl,
    this.createdAt,
    this.lastMessageAt,
    this.lastMessagePreview,
    this.unreadCount = 0,
  });

  final String id;
  final String type; // 'direct' | 'group'
  final String name;
  final List<String> members;
  final String? coverImageUrl;
  final String? createdAt;
  final String? lastMessageAt;
  final String? lastMessagePreview;
  final int unreadCount;

  bool get isGroup => type == 'group';

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        type: json['type'] as String? ?? 'direct',
        name: json['name'] as String? ?? 'Conversación',
        members: (json['members'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
        coverImageUrl: json['coverImageUrl'] as String?,
        createdAt: json['createdAt']?.toString(),
        lastMessageAt: json['lastMessageAt']?.toString(),
        lastMessagePreview: json['lastMessagePreview'] as String?,
        unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      );
}
