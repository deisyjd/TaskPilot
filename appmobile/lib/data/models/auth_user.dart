/// Usuario autenticado (forma que devuelve /api/auth/login y /api/auth/me).
class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.userRole,
    required this.initials,
    required this.color,
    this.avatarUrl,
    this.status,
  });

  final String id;
  final String name;
  final String email;
  final String role; // título visible ("Directora", ...)
  final String userRole; // admin | member | viewer
  final String initials;
  final String color;
  final String? avatarUrl;
  final String? status;

  bool get isAdmin => userRole == 'admin';

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? '',
        userRole: json['userRole'] as String? ?? 'member',
        initials: json['initials'] as String? ?? '',
        color: json['color'] as String? ?? 'bg-gray-500',
        avatarUrl: json['avatarUrl'] as String?,
        status: json['status'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'userRole': userRole,
        'initials': initials,
        'color': color,
        'avatarUrl': avatarUrl,
        'status': status,
      };
}
