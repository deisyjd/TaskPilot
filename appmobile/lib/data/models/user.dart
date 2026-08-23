/// Miembro de la empresa (para asignaciones, avatares). Espejo de `User`.
class User {
  const User({
    required this.id,
    required this.name,
    required this.role,
    required this.initials,
    required this.color,
    this.email,
    this.userRole,
    this.avatarUrl,
    this.status,
  });

  final String id;
  final String name;
  final String role; // título visible
  final String initials;
  final String color; // clase bg-* de Tailwind (se mapea en la UI)
  final String? email;
  final String? userRole;
  final String? avatarUrl;
  final String? status;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        role: json['role'] as String? ?? '',
        initials: json['initials'] as String? ?? '',
        color: json['color'] as String? ?? 'bg-gray-500',
        email: json['email'] as String?,
        userRole: json['userRole'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        status: json['status'] as String?,
      );
}
