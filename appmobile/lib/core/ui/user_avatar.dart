import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Avatar cuadrado redondeado con iniciales (estilo del diseño Wipli).
/// [primary] lo pinta en lima (usuario actual/destacado); si no, tono neutro.
/// Sin colores vívidos (regla del diseño: solo negro + lima + neutros).
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.initials,
    this.seed,
    this.size = 36,
    this.primary = false,
  });

  final String initials;
  final String? seed; // se conserva por compatibilidad de llamadas (ya no colorea)
  final double size;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final bg = primary ? AppColors.lime : context.colors.surfaceAlt;
    final fg = primary ? AppColors.ink : context.colors.textPrimary;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: TextStyle(
          color: fg,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}
