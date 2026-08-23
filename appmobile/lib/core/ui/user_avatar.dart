import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Avatar circular con iniciales. El web guarda el color como clase Tailwind
/// (`bg-orange-500`); aquí derivamos un color estable a partir de ese texto o
/// del nombre, sin depender del mapa de Tailwind.
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.initials,
    this.seed,
    this.size = 36,
  });

  final String initials;
  final String? seed; // color/nombre para derivar el tono
  final double size;

  static const _palette = [
    Color(0xFFEF4444),
    Color(0xFFF97316),
    Color(0xFFF59E0B),
    Color(0xFF22C55E),
    Color(0xFF14B8A6),
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
  ];

  Color get _color {
    final key = (seed == null || seed!.isEmpty) ? initials : seed!;
    var hash = 0;
    for (final code in key.codeUnits) {
      hash = (hash * 31 + code) & 0x7fffffff;
    }
    return _palette[hash % _palette.length];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: _color, shape: BoxShape.circle),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: TextStyle(
          color: context.colors.textPrimary,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.38,
        ),
      ),
    );
  }
}
