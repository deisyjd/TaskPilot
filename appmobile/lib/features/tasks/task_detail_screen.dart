import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';
import '../projects/project_detail_screen.dart';
import '../system/sync_controller.dart';
import '../users/users_providers.dart';
import 'task_edit_sheet.dart';
import 'tasks_providers.dart';

/// Detalle de una tarea: lectura + edición y toggle de checklist contra el API.
class TaskDetailScreen extends ConsumerStatefulWidget {
  const TaskDetailScreen({super.key, required this.task});

  final Task task;

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  late Task _task = widget.task;
  bool _busy = false;

  void _invalidateLists() {
    ref.invalidate(companyTasksProvider);
    ref.invalidate(projectTasksProvider(_task.projectId));
  }

  Future<void> _edit() async {
    final updated = await showTaskEditSheet(context, _task);
    if (updated != null && mounted) {
      setState(() => _task = updated);
      await ref.read(syncControllerProvider.notifier).refreshPending();
      _invalidateLists();
    }
  }

  Future<void> _toggleChecklist(int index) async {
    if (_busy) return;
    final base = _task;
    final companyId = ref.read(authControllerProvider).session?.activeCompanyId;
    if (companyId == null) return;
    final optimistic = [...base.checklist];
    optimistic[index] = base.checklist[index].copyWith(done: !base.checklist[index].done);
    setState(() {
      _task = base.copyWith(checklist: optimistic);
      _busy = true;
    });
    try {
      final updated =
          await ref.read(taskMutationsProvider).setChecklist(companyId, base, optimistic);
      if (!mounted) return;
      setState(() => _task = updated);
      await ref.read(syncControllerProvider.notifier).refreshPending();
      _invalidateLists();
    } catch (e) {
      if (!mounted) return;
      setState(() => _task = base);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final usersById = ref.watch(usersByIdProvider);
    final task = _task;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: context.colors.background,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Editar',
            icon: const Icon(Icons.edit_outlined),
            onPressed: _busy ? null : _edit,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 28),
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _DarkPill(label: task.status.label, filled: true),
                    _DarkPill(label: task.priority.label),
                    _DarkPill(label: task.type.label),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _MetaRow(icon: Icons.event, label: 'Vence', value: task.dueDate),
          if (task.startDate != null && task.startDate!.isNotEmpty)
            _MetaRow(icon: Icons.play_arrow, label: 'Inicia', value: task.startDate!),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionTitle('Descripción'),
            const SizedBox(height: 6),
            Text(task.description, style: TextStyle(color: context.colors.textSecondary)),
          ],
          if (task.assigneeIds.isNotEmpty) ...[
            const SizedBox(height: 20),
            const _SectionTitle('Responsables'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final id in task.assigneeIds)
                  _AssigneeChip(
                    name: usersById[id]?.name ?? 'Usuario',
                    initials: usersById[id]?.initials ?? '?',
                    seed: usersById[id]?.color ?? id,
                  ),
              ],
            ),
          ],
          if (task.checklist.isNotEmpty) ...[
            const SizedBox(height: 20),
            _SectionTitle('Checklist · ${task.checklistDone}/${task.checklistTotal}'),
            const SizedBox(height: 4),
            for (var i = 0; i < task.checklist.length; i++)
              InkWell(
                onTap: () => _toggleChecklist(i),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        task.checklist[i].done
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        size: 20,
                        color: task.checklist[i].done ? AppColors.success : context.colors.textMuted,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          task.checklist[i].text,
                          style: TextStyle(
                            color: task.checklist[i].done
                                ? context.colors.textMuted
                                : context.colors.textPrimary,
                            decoration: task.checklist[i].done
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
          if (task.comments.isNotEmpty) ...[
            const SizedBox(height: 20),
            _SectionTitle('Comentarios (${task.comments.length})'),
            const SizedBox(height: 10),
            for (final c in task.comments)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: context.colors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.colors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.author, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(c.text, style: TextStyle(color: context.colors.textSecondary)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// Pill para el header negro: [filled] en lima (estado), si no outline claro.
class _DarkPill extends StatelessWidget {
  const _DarkPill({required this.label, this.filled = false});
  final String label;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? AppColors.lime : Colors.transparent,
        borderRadius: BorderRadius.circular(99),
        border: filled ? null : Border.all(color: Colors.white24),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: filled ? AppColors.ink : Colors.white70,
        ),
      ),
    );
  }
}

class _AssigneeChip extends StatelessWidget {
  const _AssigneeChip({required this.name, required this.initials, required this.seed});
  final String name;
  final String initials;
  final String seed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 4, right: 12, top: 4, bottom: 4),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.colors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          UserAvatar(initials: initials, seed: seed, size: 26),
          const SizedBox(width: 8),
          Text(name, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: context.colors.textMuted),
          const SizedBox(width: 8),
          Text('$label: ', style: TextStyle(color: context.colors.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700));
  }
}
