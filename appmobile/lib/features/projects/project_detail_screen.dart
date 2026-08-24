import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../data/models/enums.dart';
import '../../data/models/note.dart';
import '../../data/models/project.dart';
import '../../data/models/task.dart';
import '../reports/reports_screen.dart';
import '../system/sync_controller.dart';
import '../tasks/task_create_sheet.dart';
import '../tasks/task_tile.dart';
import '../tasks/tasks_providers.dart';

/// Tareas de un proyecto (derivan del provider offline-first de la empresa).
final projectTasksProvider =
    FutureProvider.autoDispose.family<List<Task>, String>((ref, projectId) async {
  final all = await ref.watch(companyTasksProvider.future);
  return all.where((t) => t.projectId == projectId).toList();
});

/// Notas de un proyecto.
final projectNotesProvider =
    FutureProvider.autoDispose.family<List<Note>, String>((ref, projectId) async {
  return ref.read(notesRepositoryProvider).listByProject(projectId);
});

class ProjectDetailScreen extends ConsumerStatefulWidget {
  const ProjectDetailScreen({super.key, required this.project});
  final Project project;

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
  int _view = 0; // 0 Tareas · 1 Tablero · 2 Gantt · 3 Reporte

  @override
  Widget build(BuildContext context) {
    final p = widget.project;
    return Scaffold(
      appBar: AppBar(backgroundColor: context.colors.background, elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await showTaskCreateSheet(context, p.id);
          if (created != null) {
            ref.invalidate(companyTasksProvider);
            ref.read(syncControllerProvider.notifier).refreshPending();
          }
        },
        backgroundColor: AppColors.lime,
        foregroundColor: AppColors.ink,
        icon: const Icon(Icons.add),
        label: const Text('Tarea'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 0),
            child: Container(
              padding: const EdgeInsets.fromLTRB(18, 16, 14, 12),
              decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  _SegTabs(
                    labels: const ['Tareas', 'Tablero', 'Gantt', 'Reporte'],
                    selected: _view,
                    onSelect: (i) => setState(() => _view = i),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(child: _content(p.id)),
        ],
      ),
    );
  }

  Widget _content(String projectId) {
    switch (_view) {
      case 1:
        return _BoardView(projectId: projectId);
      case 2:
        return _GanttView(projectId: projectId);
      case 3:
        return _ReportView(projectId: projectId);
      default:
        return _TasksView(projectId: projectId);
    }
  }
}

/// Pestañas tipo pill sobre el header negro.
class _SegTabs extends StatelessWidget {
  const _SegTabs({required this.labels, required this.selected, required this.onSelect});
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++)
          Expanded(
            child: GestureDetector(
              onTap: () => onSelect(i),
              child: Container(
                margin: EdgeInsets.only(right: i == labels.length - 1 ? 0 : 6),
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: i == selected ? AppColors.lime : Colors.transparent,
                  borderRadius: BorderRadius.circular(99),
                  border: i == selected ? null : Border.all(color: Colors.white24),
                ),
                child: Text(
                  labels[i],
                  style: TextStyle(
                    color: i == selected ? AppColors.ink : Colors.white70,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ─── Tareas ────────────────────────────────────────────────────────
class _TasksView extends ConsumerWidget {
  const _TasksView({required this.projectId});
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(projectTasksProvider(projectId));
    final notesAsync = ref.watch(projectNotesProvider(projectId));
    return RefreshIndicator(
      color: AppColors.lime,
      onRefresh: () async {
        ref.invalidate(companyTasksProvider);
        ref.invalidate(projectNotesProvider(projectId));
      },
      child: tasksAsync.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
        data: (tasks) => ListView(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 96),
          children: [
            if (tasks.isEmpty)
              const EmptyView(icon: Icons.check_circle_outline, message: 'Sin tareas aún', scrollable: false)
            else
              for (final t in tasks) TaskTile(task: t, onTap: () => context.push('/task/${t.id}', extra: t)),
            notesAsync.maybeWhen(
              data: (notes) => notes.isEmpty
                  ? const SizedBox.shrink()
                  : Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Notas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          for (final n in notes) _NoteCard(note: n),
                        ],
                      ),
                    ),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.note});
  final Note note;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (note.title.isNotEmpty)
            Text(note.title, style: const TextStyle(fontWeight: FontWeight.w700)),
          if (note.content.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(note.content, style: TextStyle(color: context.colors.textSecondary)),
          ],
        ],
      ),
    );
  }
}

// ─── Tablero (chips por estado + lista) ────────────────────────────
class _BoardView extends ConsumerStatefulWidget {
  const _BoardView({required this.projectId});
  final String projectId;

  @override
  ConsumerState<_BoardView> createState() => _BoardViewState();
}

class _BoardViewState extends ConsumerState<_BoardView> {
  TaskStatus _sel = TaskStatus.pending;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(projectTasksProvider(widget.projectId));
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
      data: (tasks) {
        final counts = {for (final s in TaskStatus.values) s: tasks.where((t) => t.status == s).length};
        final list = tasks.where((t) => t.status == _sel).toList();
        return Column(
          children: [
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                children: [
                  for (final s in TaskStatus.values)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text('${s.label}  ${counts[s] ?? 0}'),
                        selected: s == _sel,
                        onSelected: (_) => setState(() => _sel = s),
                        selectedColor: AppColors.lime,
                        labelStyle: TextStyle(
                          color: s == _sel ? AppColors.ink : context.colors.textSecondary,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
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
          ],
        );
      },
    );
  }
}

// ─── Gantt ─────────────────────────────────────────────────────────
class _GanttView extends ConsumerWidget {
  const _GanttView({required this.projectId});
  final String projectId;

  static DateTime? _parse(String? s) => (s == null || s.isEmpty) ? null : DateTime.tryParse(s);
  static String _fmt(DateTime d) => '${d.day}/${d.month}';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(projectTasksProvider(projectId));
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
      data: (tasks) {
        final rows = <(Task, DateTime, DateTime)>[];
        for (final t in tasks) {
          final due = _parse(t.dueDate) ?? DateTime.now();
          final start = _parse(t.startDate) ?? due;
          rows.add((t, start.isAfter(due) ? due : start, due));
        }
        if (rows.isEmpty) {
          return const EmptyView(icon: Icons.timeline, message: 'Sin fechas que graficar', scrollable: false);
        }
        final minD = rows.map((e) => e.$2).reduce((a, b) => a.isBefore(b) ? a : b);
        final maxD = rows.map((e) => e.$3).reduce((a, b) => a.isAfter(b) ? a : b);
        final span = maxD.difference(minD).inDays.clamp(1, 100000);
        return ListView(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 96),
          children: [
            Row(
              children: [
                const SizedBox(width: 110),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_fmt(minD), style: TextStyle(fontSize: 11, color: context.colors.textMuted)),
                      Text(_fmt(maxD), style: TextStyle(fontSize: 11, color: context.colors.textMuted)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    SizedBox(
                      width: 110,
                      child: Text(
                        row.$1.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    Expanded(
                      child: LayoutBuilder(
                        builder: (ctx, cons) {
                          final w = cons.maxWidth;
                          final left = (row.$2.difference(minD).inDays / span) * w;
                          final barW = (row.$3.difference(row.$2).inDays.clamp(1, span) / span) * w;
                          return SizedBox(
                            height: 22,
                            child: Stack(
                              children: [
                                Positioned(
                                  top: 5,
                                  height: 12,
                                  left: left.clamp(0.0, (w - 6).clamp(0.0, w)),
                                  width: barW.clamp(6.0, w),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: row.$1.status == TaskStatus.done
                                          ? AppColors.lime
                                          : AppColors.lime.withValues(alpha: 0.55),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

// ─── Reporte del proyecto ──────────────────────────────────────────
class _ReportView extends ConsumerWidget {
  const _ReportView({required this.projectId});
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(projectTasksProvider(projectId));
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
      data: (tasks) {
        final counts = {for (final s in TaskStatus.values) s: tasks.where((t) => t.status == s).length};
        final max = counts.values.fold<int>(0, (a, b) => a > b ? a : b);
        return ListView(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 96),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.colors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: context.colors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tareas por estado · ${tasks.length}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 14),
                  for (final s in TaskStatus.values)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 104,
                            child: Text(
                              s.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: context.colors.textSecondary),
                            ),
                          ),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(99),
                              child: LinearProgressIndicator(
                                value: max == 0 ? 0 : (0.06 + 0.94 * ((counts[s] ?? 0) / max)).clamp(0.0, 1.0),
                                minHeight: 16,
                                backgroundColor: context.colors.surfaceAlt,
                                valueColor: const AlwaysStoppedAnimation(AppColors.lime),
                              ),
                            ),
                          ),
                          SizedBox(
                            width: 30,
                            child: Text(
                              '${counts[s] ?? 0}',
                              textAlign: TextAlign.right,
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => showSendReportSheet(context, initialProjectIds: [projectId]),
              icon: const Icon(Icons.mail_outline),
              label: const Text('Enviar reporte de este proyecto'),
            ),
          ],
        );
      },
    );
  }
}
