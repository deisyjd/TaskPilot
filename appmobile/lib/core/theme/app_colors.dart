import 'package:flutter/material.dart';

/// Paleta Wipli. Base oscura (#111318) + acento lima (#DFFF5F).
class AppColors {
  const AppColors._();

  // Marca
  static const Color lime = Color(0xFFDFFF5F);
  static const Color ink = Color(0xFF111318);

  // Superficies (tema oscuro)
  static const Color background = Color(0xFF111318);
  static const Color surface = Color(0xFF1A1D24);
  static const Color surfaceAlt = Color(0xFF232733);
  static const Color border = Color(0xFF2E323D);

  // Texto
  static const Color textPrimary = Color(0xFFF5F6F8);
  static const Color textSecondary = Color(0xFF9AA0AD);
  static const Color textMuted = Color(0xFF6B7280);

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
  static const Color danger = Color(0xFFEF4444);
  static const Color success = Color(0xFF22C55E);
}
