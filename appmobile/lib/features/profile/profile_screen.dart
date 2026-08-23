import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
import '../auth/auth_controller.dart';

/// Perfil: datos del usuario, selector de empresa (multi-empresa) y logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;
    final user = session?.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: user == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    UserAvatar(initials: user.initials, seed: user.color, size: 56),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text(user.email, style: TextStyle(color: context.colors.textSecondary)),
                          if (user.role.isNotEmpty)
                            Text(user.role, style: TextStyle(fontSize: 12, color: context.colors.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                const Text('Empresa activa', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                if (session != null)
                  RadioGroup<String>(
                    groupValue: session.activeCompanyId,
                    onChanged: (v) {
                      if (auth.submitting || v == null) return;
                      ref.read(authControllerProvider.notifier).switchCompany(v);
                    },
                    child: Column(
                      children: [
                        for (final c in session.companies)
                          RadioListTile<String>(
                            value: c.id,
                            title: Text(c.name),
                            subtitle: c.role != null ? Text(c.role!) : null,
                            contentPadding: EdgeInsets.zero,
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: ctx.colors.surface,
                        title: const Text('Cerrar sesión'),
                        content: const Text('¿Seguro que quieres salir?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancelar'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Salir', style: TextStyle(color: AppColors.danger)),
                          ),
                        ],
                      ),
                    );
                    if (ok == true) {
                      await ref.read(authControllerProvider.notifier).logout();
                    }
                  },
                  icon: const Icon(Icons.logout, color: AppColors.danger),
                  label: const Text('Cerrar sesión', style: TextStyle(color: AppColors.danger)),
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'Wipli · ${AppConfig.flavor} · ${AppConfig.apiUrl}',
                    style: TextStyle(fontSize: 11, color: context.colors.textMuted),
                  ),
                ),
              ],
            ),
    );
  }
}
