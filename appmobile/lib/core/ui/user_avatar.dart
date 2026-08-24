import 'dart:convert';

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../theme/app_colors.dart';

/// Avatar cuadrado redondeado (estilo Wipli). Muestra la **foto de perfil**
/// ([imageUrl]) si existe — soporta URL http/relativa y data URI base64 — con
/// fallback a las iniciales. [primary] usa lima (usuario actual/destacado).
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.initials,
    this.seed,
    this.size = 36,
    this.primary = false,
    this.imageUrl,
  });

  final String initials;
  final String? seed; // compat: ya no colorea
  final double size;
  final bool primary;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(size * 0.32);
    final fallback = _initialsBox(context, radius);
    final url = imageUrl;
    if (url == null || url.isEmpty) return fallback;
    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(width: size, height: size, child: _image(url, fallback)),
    );
  }

  Widget _image(String url, Widget fallback) {
    if (url.startsWith('data:')) {
      try {
        final bytes = base64Decode(url.substring(url.indexOf(',') + 1));
        return Image.memory(
          bytes,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => fallback,
        );
      } catch (_) {
        return fallback;
      }
    }
    return Image.network(
      AppConfig.media(url),
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
    );
  }

  Widget _initialsBox(BuildContext context, BorderRadius radius) {
    final bg = primary ? AppColors.lime : context.colors.surfaceAlt;
    final fg = primary ? AppColors.ink : context.colors.textPrimary;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, borderRadius: radius),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: size * 0.36),
      ),
    );
  }
}
