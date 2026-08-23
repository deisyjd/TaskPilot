import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/enums.dart';
import '../auth/auth_controller.dart';
import '../system/sync_indicator.dart';
import '../tasks/task_tile.dart';
import '../tasks/tasks_providers.dart';

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
    final tasksAsync = ref.watch(companyTasksProvider);
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
          const Padding(
            padding: EdgeInsets.only(right: 4),
            child: Center(child: SyncIndicator()),
          ),
          IconButton(
            tooltip: 'Línea de tiempo',
            icon: const Icon(Icons.calendar_view_week),
            onPressed: () => context.push('/timeline'),
          ),
          if (user != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: UserAvatar(initials: user.initials, seed: user.color),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () => ref.refresh(companyTasksProvider.future),
        child: tasksAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: '$e',
            onRetry: () => ref.invalidate(companyTasksProvider),
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
