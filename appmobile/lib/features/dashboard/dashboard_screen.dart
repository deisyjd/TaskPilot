import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';
import '../tasks/task_tile.dart';

/// Tareas de la empresa activa. Se recarga al cambiar de empresa porque la
/// key depende del activeCompanyId.
final dashboardTasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  // Se re-evalúa cuando cambia la sesión (empresa activa).
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(tasksRepositoryProvider).list();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  static String get _today {
    final now = DateTime.now();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '${now.year}-$m-$d';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final tasksAsync = ref.watch(dashboardTasksProvider);
    final user = auth.session?.user;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hola, ${user?.name.split(' ').first ?? ''}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            if (auth.session?.activeCompany != null)
              Text(
                auth.session!.activeCompany!.name,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
          ],
        ),
        actions: [
          if (user != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: UserAvatar(initials: user.initials, seed: user.color),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () => ref.refresh(dashboardTasksProvider.future),
        child: tasksAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.lime)),
          error: (e, _) => _ErrorState(
            message: '$e',
            onRetry: () => ref.invalidate(dashboardTasksProvider),
          ),
          data: (tasks) {
            final pending = tasks.where((t) => t.status == TaskStatus.pending).length;
            final inProgress = tasks.where((t) => t.status == TaskStatus.inProgress).length;
            final dueToday = tasks.where((t) => t.dueDate == _today && t.status != TaskStatus.done).toList();

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    _StatCard(label: 'Pendientes', value: pending, color: AppColors.statusPending),
                    const SizedBox(width: 12),
                    _StatCard(label: 'En proceso', value: inProgress, color: AppColors.statusInProgress),
                    const SizedBox(width: 12),
                    _StatCard(label: 'Vencen hoy', value: dueToday.length, color: AppColors.statusReview),
                  ],
                ),
                const SizedBox(height: 24),
                const Text('Vencen hoy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (dueToday.isEmpty)
                  const _EmptyHint(text: 'Nada vence hoy. 🎉')
                else
                  ...dueToday.map(
                    (t) => TaskTile(
                      task: t,
                      onTap: () => context.push('/task/${t.id}', extra: t),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(height: 10),
            Text('$value', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      alignment: Alignment.center,
      child: Text(text, style: const TextStyle(color: AppColors.textSecondary)),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        const Icon(Icons.cloud_off, size: 48, color: AppColors.textMuted),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
        ),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ),
      ],
    );
  }
}
