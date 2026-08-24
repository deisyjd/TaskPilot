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
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
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
              final dueToday =
                  tasks.where((t) => t.dueDate == _today && t.status != TaskStatus.done).toList();

              return ListView(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 96),
                children: [
                  _Header(
                    firstName: user?.name.split(' ').first ?? '',
                    company: auth.session?.activeCompany?.name,
                    initials: user?.initials ?? '',
                    imageUrl: user?.avatarUrl,
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(child: _StatCard(label: 'Pendientes', value: pending)),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(label: 'En proceso', value: inProgress, emphasis: true)),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(label: 'Vencen hoy', value: dueToday.length)),
                    ],
                  ),
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Vencen hoy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      InkWell(
                        onTap: () => context.push('/timeline'),
                        child: Text(
                          'VER TODO',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: context.colors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (dueToday.isEmpty)
                    _EmptyHint(text: 'Nada vence hoy 🎉', color: context.colors.textSecondary)
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
      ),
    );
  }
}

/// Header negro redondeado del diseño: marca + estado + avatar + saludo.
class _Header extends StatelessWidget {
  const _Header({required this.firstName, required this.company, required this.initials, this.imageUrl});

  final String firstName;
  final String? company;
  final String initials;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 14, 20),
      decoration: BoxDecoration(
        color: AppColors.ink,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Wipli',
                style: TextStyle(color: AppColors.lime, fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(width: 10),
              const SyncIndicator(),
              const Spacer(),
              IconButton(
                tooltip: 'Línea de tiempo',
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.calendar_view_week, color: Colors.white70, size: 22),
                onPressed: () => context.push('/timeline'),
              ),
              const SizedBox(width: 4),
              UserAvatar(initials: initials, size: 44, primary: true, imageUrl: imageUrl),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Hola, $firstName',
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
          ),
          if (company != null && company!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(
                company!.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Tarjeta de estadística; [emphasis] la invierte a negro (como el diseño).
class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, this.emphasis = false});

  final String label;
  final int value;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final bg = emphasis ? AppColors.ink : context.colors.surface;
    final fg = emphasis ? Colors.white : context.colors.textPrimary;
    final labelColor = emphasis ? Colors.white70 : context.colors.textMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: emphasis ? null : Border.all(color: context.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: labelColor),
          ),
          const SizedBox(height: 10),
          Text('$value', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: fg)),
        ],
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint({required this.text, required this.color});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      alignment: Alignment.center,
      child: Text(text, style: TextStyle(color: color)),
    );
  }
}
