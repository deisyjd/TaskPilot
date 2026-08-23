import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import 'auth_controller.dart';

/// Pantalla inicial: dispara el auto-login y muestra el logo mientras se
/// resuelve la sesión. El router redirige según el resultado.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Ejecuta el bootstrap una vez montado el primer frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authControllerProvider.notifier).bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _WipliMark(),
            SizedBox(height: 24),
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.lime),
            ),
          ],
        ),
      ),
    );
  }
}

class _WipliMark extends StatelessWidget {
  const _WipliMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.lime,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Text(
        'wipli',
        style: TextStyle(
          color: AppColors.ink,
          fontSize: 30,
          fontWeight: FontWeight.w800,
          letterSpacing: -1,
        ),
      ),
    );
  }
}
