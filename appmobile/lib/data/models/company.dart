/// Empresa a la que pertenece el usuario (multi-tenancy). Espejo de `Company`.
class Company {
  const Company({
    required this.id,
    required this.name,
    required this.slug,
    required this.color,
    this.role,
  });

  final String id;
  final String name;
  final String slug;
  final String color;
  final String? role; // rol del usuario en esta empresa

  factory Company.fromJson(Map<String, dynamic> json) => Company(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        color: json['color'] as String? ?? '#6366f1',
        role: json['role'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'color': color,
        'role': role,
      };
}
