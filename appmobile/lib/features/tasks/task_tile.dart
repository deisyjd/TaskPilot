import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';

/// Fila de tarea con el estilo del diseño Wipli: barra de acento a la izquierda,
/// pill de estado, prioridad y barra de progreso lima con done/total.
class TaskTile extends StatelessWidget {
  const TaskTile({super.key, required this.task, this.onTap});

  final Task task;
  final VoidCallback? onTap;

  Color _accent(BuildContext context) => switch (task.status) {
        TaskStatus.inProgress || TaskStatus.done => AppColors.lime,
        TaskStatus.blocked => AppColors.danger,
        _ => context.colors.border,
      };

  @override
  Widget build(BuildContext context) {
    final total = task.checklistTotal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: context.colors.border),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(width: 4, color: _accent(context)),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              task.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _StatusPill(status: task.status),
                                const SizedBox(width: 8),
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: context.colors.textMuted,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  task.priority.label,
                                  style: TextStyle(fontSize: 12, color: context.colors.textSecondary),
                                ),
                              ],
                            ),
                            if (total > 0) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(99),
                                      child: LinearProgressIndicator(
                                        value: task.checklistDone / total,
                                        minHeight: 6,
                                        backgroundColor: context.colors.surfaceAlt,
                                        valueColor: const AlwaysStoppedAnimation(AppColors.lime),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '${task.checklistDone}/$total',
                                    style: TextStyle(fontSize: 11, color: context.colors.textMuted),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Pill de estado: EN PROCESO (relleno ink), COMPLETADO (lima), otros (outline).
class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final TaskStatus status;

  @override
  Widget build(BuildContext context) {
    late final Color bg;
    late final Color fg;
    Color? border;
    switch (status) {
      case TaskStatus.inProgress:
        bg = AppColors.ink;
        fg = Colors.white;
      case TaskStatus.done:
        bg = AppColors.lime;
        fg = AppColors.ink;
      case TaskStatus.blocked:
        bg = AppColors.danger.withValues(alpha: 0.18);
        fg = AppColors.danger;
      default:
        bg = Colors.transparent;
        fg = context.colors.textSecondary;
        border = context.colors.border;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
        border: border == null ? null : Border.all(color: border),
      ),
      child: Text(
        status.label.toUpperCase(),
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
          color: fg,
        ),
      ),
    );
  }
}
