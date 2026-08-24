import 'package:flutter/material.dart';

/// Paleta Wipli (adaptada del diseño "Wipli App Mobile"): acento lima
/// (#DFFF5F), ink casi negro (#0A0A0A) y superficies cálidas.
///
/// Los colores de marca y de estado son iguales en ambos temas y viven en
/// [AppColors] como `static const`. Las superficies/textos que dependen del
/// tema (claro/oscuro) viven en la [ThemeExtension] [WipliColors].
class AppColors {
  const AppColors._();

  // Marca
  static const Color lime = Color(0xFFDFFF5F);
  static const Color ink = Color(0xFF0A0A0A);
  static const Color limeSoft = Color(0xFFF5FFD6); // fondo lima suave (claro)
  static const Color limeInk = Color(0xFF5C6B24); // texto lima sobre claro

  // Superficies por defecto (tono oscuro; la mayoría de widgets usan
  // context.colors, esto queda como respaldo/coherencia).
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF151515);
  static const Color surfaceAlt = Color(0xFF232323);
  static const Color border = Color(0xFF2A2A24);

  // Texto
  static const Color textPrimary = Color(0xFFF6F6F2);
  static const Color textSecondary = Color(0xFF8C8C84);
  static const Color textMuted = Color(0xFF6B6B64);

  // Estados de tarea (espejo de STATUS_DOT_COLORS del web)
  static const Color statusPending = Color(0xFF9CA3AF);
  static const Color statusInProgress = Color(0xFF3B82F6);
  static const Color statusReview = Color(0xFFF59E0B);
  static const Color statusScheduled = Color(0xFF8B5CF6);
  static const Color statusDone = Color(0xFF22C55E);
  static const Color statusBlocked = Color(0xFFEF4444);

  // Prioridad
  static const Color priorityLow = Color(0xFF9CA3AF);
  static const Color priorityMedium = Color(0xFF3B82F6);
  static const Color priorityHigh = Color(0xFFF97316);
  static const Color priorityUrgent = Color(0xFFEF4444);

  // Feedback
  static const Color danger = Color(0xFFFF8A80); // coral del diseño
  static const Color success = Color(0xFF22C55E);
}

/// Colores que dependen del brillo del tema (superficies, bordes, textos).
///
/// Se accede vía `context.colors.<x>` (ver [WipliColorsX]).
@immutable
class WipliColors extends ThemeExtension<WipliColors> {
  const WipliColors({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.border,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
  });

  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color border;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;

  /// Paleta oscura (del diseño: negro cálido).
  static const WipliColors dark = WipliColors(
    background: Color(0xFF0A0A0A),
    surface: Color(0xFF151515),
    surfaceAlt: Color(0xFF232323),
    border: Color(0xFF2A2A24),
    textPrimary: Color(0xFFF6F6F2),
    textSecondary: Color(0xFF8C8C84),
    textMuted: Color(0xFF6B6B64),
  );

  /// Paleta clara (del diseño: off-white cálido).
  static const WipliColors light = WipliColors(
    background: Color(0xFFF6F6F2),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFF0F0EA),
    border: Color(0xFFE6E6E0),
    textPrimary: Color(0xFF0A0A0A),
    textSecondary: Color(0xFF6B6B64),
    textMuted: Color(0xFF8C8C84),
  );

  @override
  WipliColors copyWith({
    Color? background,
    Color? surface,
    Color? surfaceAlt,
    Color? border,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
  }) {
    return WipliColors(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      border: border ?? this.border,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
    );
  }

  @override
  WipliColors lerp(ThemeExtension<WipliColors>? other, double t) {
    if (other is! WipliColors) return this;
    return WipliColors(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      border: Color.lerp(border, other.border, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
    );
  }
}

/// Acceso rápido a la paleta dependiente del tema: `context.colors.surface`.
extension WipliColorsX on BuildContext {
  WipliColors get colors => Theme.of(this).extension<WipliColors>()!;
}
