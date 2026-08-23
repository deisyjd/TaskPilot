/// Nota de un proyecto. Espejo de `Note` (serializada por el backend con
/// `isOwner`/`sharedWith` según el usuario actual).
class Note {
  const Note({
    required this.id,
    required this.title,
    required this.content,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.color,
    this.isOwner,
  });

  final String id;
  final String title;
  final String content;
  final String createdBy;
  final String createdAt;
  final String updatedAt;
  final String? color;
  final bool? isOwner;

  factory Note.fromJson(Map<String, dynamic> json) => Note(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        content: json['content'] as String? ?? '',
        createdBy: json['createdBy'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? '',
        updatedAt: json['updatedAt'] as String? ?? '',
        color: json['color'] as String?,
        isOwner: json['isOwner'] as bool?,
      );
}
