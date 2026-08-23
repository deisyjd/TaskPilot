import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/task.dart';
import '../tasks/task_tile.dart';
import '../tasks/tasks_providers.dart';

/// Línea de tiempo: vista de la semana actual (lunes a domingo) con las tareas
/// agrupadas por su fecha de vencimiento.
class TimelineScreen extends ConsumerWidget {
  const TimelineScreen({super.key});

  static const _dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  static String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyTasksProvider);
    final now = DateTime.now();
    final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
    final days = [for (var i = 0; i < 7; i++) monday.add(Duration(days: i))];
    final todayIso = _iso(DateTime(now.year, now.month, now.day));

    return Scaffold(
      appBar: AppBar(title: const Text('Línea de tiempo')),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () => ref.refresh(companyTasksProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.lime)),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 80),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text('$e', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
              ),
            ],
          ),
          data: (tasks) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (var i = 0; i < days.length; i++)
                  _DaySection(
                    label: '${_dayNames[i]} ${days[i].day}',
                    isToday: _iso(days[i]) == todayIso,
                    tasks: tasks.where((t) => t.dueDate == _iso(days[i])).toList(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DaySection extends StatelessWidget {
  const _DaySection({required this.label, required this.isToday, required this.tasks});

  final String label;
  final bool isToday;
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 8),
          child: Row(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: isToday ? AppColors.lime : AppColors.textPrimary,
                ),
              ),
              if (isToday) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.lime.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Hoy', style: TextStyle(fontSize: 11, color: AppColors.lime)),
                ),
              ],
            ],
          ),
        ),
        if (tasks.isEmpty)
          const Padding(
            padding: EdgeInsets.only(bottom: 8, left: 2),
            child: Text('—', style: TextStyle(color: AppColors.textMuted)),
          )
        else
          for (final t in tasks)
            Builder(
              builder: (context) => TaskTile(
                task: t,
                onTap: () => context.push('/task/${t.id}', extra: t),
              ),
            ),
        const Divider(),
      ],
    );
  }
}
