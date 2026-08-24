import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../data/models/enums.dart';
import '../tasks/task_tile.dart';
import '../tasks/tasks_providers.dart';

/// Tablero (diseño Wipli): header negro "Tablero" + chips de estado con
/// contador (columnas como filtros) + lista de tareas del estado elegido.
class KanbanScreen extends ConsumerStatefulWidget {
  const KanbanScreen({super.key});

  @override
  ConsumerState<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends ConsumerState<KanbanScreen> {
  TaskStatus _sel = TaskStatus.pending;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyTasksProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
          data: (tasks) {
            final counts = {
              for (final s in TaskStatus.values) s: tasks.where((t) => t.status == s).length,
            };
            final list = tasks.where((t) => t.status == _sel).toList();
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
                  child: _Header(counts: counts, selected: _sel, onSelect: (s) => setState(() => _sel = s)),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.lime,
                    onRefresh: () => ref.refresh(companyTasksProvider.future),
                    child: list.isEmpty
                        ? const EmptyView(icon: Icons.check_circle_outline, message: 'Sin tareas en este estado')
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 96),
                            children: [
                              for (final t in list)
                                TaskTile(task: t, onTap: () => context.push('/task/${t.id}', extra: t)),
                            ],
                          ),
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

class _Header extends StatelessWidget {
  const _Header({required this.counts, required this.selected, required this.onSelect});

  final Map<TaskStatus, int> counts;
  final TaskStatus selected;
  final ValueChanged<TaskStatus> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 12, 14),
      decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tablero', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          SizedBox(
            height: 34,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final s in TaskStatus.values)
                  _Chip(
                    label: s.label,
                    count: counts[s] ?? 0,
                    selected: s == selected,
                    onTap: () => onSelect(s),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.count, required this.selected, required this.onTap});

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.lime : Colors.transparent,
            borderRadius: BorderRadius.circular(99),
            border: selected ? null : Border.all(color: Colors.white24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: selected ? AppColors.ink : Colors.white70,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$count',
                style: TextStyle(
                  color: selected ? AppColors.ink : Colors.white38,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
