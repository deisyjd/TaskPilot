import 'auth_user.dart';
import 'company.dart';

/// Respuesta de /api/auth/login y /api/auth/google: usuario + empresa activa +
/// empresas a las que pertenece.
class Session {
  const Session({
    required this.user,
    required this.activeCompanyId,
    required this.companies,
  });

  final AuthUser user;
  final String activeCompanyId;
  final List<Company> companies;

  Company? get activeCompany {
    for (final c in companies) {
      if (c.id == activeCompanyId) return c;
    }
    return companies.isNotEmpty ? companies.first : null;
  }

  factory Session.fromLoginJson(Map<String, dynamic> json) => Session(
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
        activeCompanyId: json['activeCompanyId'] as String? ?? '',
        companies: (json['companies'] as List<dynamic>? ?? [])
            .map((e) => Company.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  /// /api/auth/me devuelve los campos del usuario en la raíz (no bajo `user`).
  factory Session.fromMeJson(Map<String, dynamic> json) => Session(
        user: AuthUser.fromJson(json),
        activeCompanyId: json['activeCompanyId'] as String? ?? '',
        companies: (json['companies'] as List<dynamic>? ?? [])
            .map((e) => Company.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  Session copyWith({String? activeCompanyId}) => Session(
        user: user,
        activeCompanyId: activeCompanyId ?? this.activeCompanyId,
        companies: companies,
      );
}
