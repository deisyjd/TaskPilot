import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Vistas de estado reutilizables (F5): carga, vacío y error con reintento.
/// Se usan en todas las pantallas para una UX consistente.

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator(color: AppColors.lime));
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.icon,
    required this.message,
    this.scrollable = true,
  });

  final IconData icon;
  final String message;
  final bool scrollable; // envuelve en ListView para permitir pull-to-refresh

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 48, color: AppColors.textMuted),
        const SizedBox(height: 12),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSecondary),
        ),
      ],
    );
    if (!scrollable) return Center(child: content);
    return ListView(
      children: [
        const SizedBox(height: 120),
        content,
      ],
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    this.onRetry,
    this.scrollable = true,
  });

  final String message;
  final VoidCallback? onRetry;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.cloud_off, size: 48, color: AppColors.textMuted),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ),
        if (onRetry != null) ...[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ],
    );
    if (!scrollable) return Center(child: content);
    return ListView(
      children: [
        const SizedBox(height: 100),
        content,
      ],
    );
  }
}
