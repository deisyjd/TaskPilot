import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../users/users_providers.dart';

/// Detalle de una tarea (lectura). La edición y el toggle de checklist contra
/// el API llegan en la continuación de F3.
class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({super.key, required this.task});

  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersById = ref.watch(usersByIdProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Tarea')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            task.title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Chip(label: task.status.label, color: task.status.dotColor),
              _Chip(label: task.priority.label, color: task.priority.color),
              _Chip(label: task.type.label, color: AppColors.textMuted),
            ],
          ),
          const SizedBox(height: 16),
          _MetaRow(icon: Icons.event, label: 'Vence', value: task.dueDate),
          if (task.startDate != null && task.startDate!.isNotEmpty)
            _MetaRow(icon: Icons.play_arrow, label: 'Inicia', value: task.startDate!),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionTitle('Descripción'),
            const SizedBox(height: 6),
            Text(task.description, style: const TextStyle(color: AppColors.textSecondary)),
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
            const SizedBox(height: 8),
            for (final item in task.checklist)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(
                      item.done ? Icons.check_circle : Icons.radio_button_unchecked,
                      size: 20,
                      color: item.done ? AppColors.success : AppColors.textMuted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item.text,
                        style: TextStyle(
                          color: item.done ? AppColors.textMuted : AppColors.textPrimary,
                          decoration: item.done ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                  ],
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
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.author, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(c.text, style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
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
          Icon(icon, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: AppColors.textSecondary)),
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
