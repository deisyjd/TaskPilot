import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
import '../auth/auth_controller.dart';

/// Perfil (diseño Wipli): header negro con el usuario + tarjetas de empresa,
/// configuración y logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;
    final user = session?.user;

    if (user == null) return const Scaffold(body: SizedBox.shrink());

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 96),
          children: [
            // Header negro
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
              child: Row(
                children: [
                  UserAvatar(initials: user.initials, size: 56, primary: true, imageUrl: user.avatarUrl),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 3),
                        Text(user.email, style: const TextStyle(color: Colors.white54, fontSize: 13)),
                        if (user.role.isNotEmpty)
                          Text(user.role, style: const TextStyle(fontSize: 12, color: Colors.white38)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const _SectionLabel('Empresa activa'),
            const SizedBox(height: 8),
            if (session != null)
              _Card(
                child: RadioGroup<String>(
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
                          activeColor: AppColors.lime,
                          title: Text(c.name),
                          subtitle: c.role != null ? Text(c.role!) : null,
                          contentPadding: EdgeInsets.zero,
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 20),
            const _SectionLabel('Configuración'),
            const SizedBox(height: 8),
            _Card(
              padding: EdgeInsets.zero,
              child: ListTile(
                onTap: () => context.push('/reports'),
                leading: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.bar_chart, color: AppColors.ink, size: 20),
                ),
                title: const Text('Reportes', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  'Gráfico de tareas y envío por correo',
                  style: TextStyle(color: context.colors.textSecondary, fontSize: 12),
                ),
                trailing: Icon(Icons.chevron_right, color: context.colors.textMuted),
              ),
            ),
            const SizedBox(height: 22),
            OutlinedButton.icon(
              onPressed: () => _confirmLogout(context, ref),
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text('Cerrar sesión', style: TextStyle(color: AppColors.danger)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.danger)),
            ),
            const SizedBox(height: 20),
            Center(
              child: Text(
                'Wipli · ${AppConfig.flavor} · ${AppConfig.apiUrl}',
                style: TextStyle(fontSize: 11, color: context.colors.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.colors.surface,
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que quieres salir?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Salir', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok == true) await ref.read(authControllerProvider.notifier).logout();
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.0,
        color: context.colors.textMuted,
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 4)});
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.colors.border),
      ),
      child: child,
    );
  }
}
