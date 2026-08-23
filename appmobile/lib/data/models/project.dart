/// Proyecto. Espejo de `Project` (el API serializa `members` como lista de ids
/// y agrega `featured` según el usuario actual — ver `serializeProject`).
class Project {
  const Project({
    required this.id,
    required this.name,
    required this.color,
    this.companyId,
    this.description,
    this.coverImageUrl,
    this.logoUrl,
    this.status,
    this.featured = false,
    this.members = const [],
    this.viewerUserIds = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String color;
  final String? companyId;
  final String? description;
  final String? coverImageUrl;
  final String? logoUrl;
  final String? status;
  final bool featured;
  final List<String> members;
  final List<String> viewerUserIds;
  final String? createdAt;
  final String? updatedAt;

  factory Project.fromJson(Map<String, dynamic> json) => Project(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        color: json['color'] as String? ?? '#6366f1',
        companyId: json['companyId'] as String?,
        description: json['description'] as String?,
        coverImageUrl: json['coverImageUrl'] as String?,
        logoUrl: json['logoUrl'] as String?,
        status: json['status'] as String?,
        featured: json['featured'] as bool? ?? false,
        members: _stringList(json['members']),
        viewerUserIds: _stringList(json['viewerUserIds']),
        createdAt: json['createdAt'] as String?,
        updatedAt: json['updatedAt'] as String?,
      );

  static List<String> _stringList(dynamic value) {
    if (value is List) return value.map((e) => e.toString()).toList();
    return const [];
  }
}
