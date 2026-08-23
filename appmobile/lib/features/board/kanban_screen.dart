import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';
import '../system/sync_controller.dart';
import '../tasks/tasks_providers.dart';

/// Tablero Kanban: una columna por estado, con arrastrar/soltar para mover una
/// tarea de estado (PATCH optimista).
class KanbanScreen extends ConsumerStatefulWidget {
  const KanbanScreen({super.key});

  @override
  ConsumerState<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends ConsumerState<KanbanScreen> {
  List<Task>? _tasks;

  Future<void> _move(Task task, TaskStatus to) async {
    if (task.status == to || _tasks == null) return;
    final companyId = ref.read(authControllerProvider).session?.activeCompanyId;
    if (companyId == null) return;
    final previous = _tasks!;
    final idx = previous.indexWhere((t) => t.id == task.id);
    if (idx < 0) return;
    setState(() {
      final next = [...previous];
      next[idx] = task.copyWith(status: to);
      _tasks = next;
    });
    try {
      await ref.read(taskMutationsProvider).updateStatus(companyId, task, to);
      await ref.read(syncControllerProvider.notifier).refreshPending();
      ref.invalidate(companyTasksProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() => _tasks = previous);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    // Al refrescar/cambiar empresa, reemplaza el estado local con lo del server.
    ref.listen<AsyncValue<List<Task>>>(companyTasksProvider, (_, next) {
      next.whenData((data) => setState(() => _tasks = List.of(data)));
    });
    final async = ref.watch(companyTasksProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Tablero')),
      body: async.when(
        loading: () => _tasks != null
            ? _board(_tasks!)
            : const Center(child: CircularProgressIndicator(color: AppColors.lime)),
        error: (e, _) => _tasks != null
            ? _board(_tasks!)
            : Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('$e', textAlign: TextAlign.center, style: TextStyle(color: context.colors.textSecondary)),
                ),
              ),
        data: (server) {
          _tasks ??= List.of(server);
          return _board(_tasks!);
        },
      ),
    );
  }

  Widget _board(List<Task> tasks) {
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(12),
      children: [
        for (final status in TaskStatus.values)
          _Column(
            status: status,
            tasks: tasks.where((t) => t.status == status).toList(),
            onAccept: (task) => _move(task, status),
            onOpen: (task) => context.push('/task/${task.id}', extra: task),
          ),
      ],
    );
  }
}

class _Column extends StatelessWidget {
  const _Column({
    required this.status,
    required this.tasks,
    required this.onAccept,
    required this.onOpen,
  });

  final TaskStatus status;
  final List<Task> tasks;
  final ValueChanged<Task> onAccept;
  final ValueChanged<Task> onOpen;

  @override
  Widget build(BuildContext context) {
    return DragTarget<Task>(
      onWillAcceptWithDetails: (details) => details.data.status != status,
      onAcceptWithDetails: (details) => onAccept(details.data),
      builder: (context, candidate, rejected) {
        final highlighted = candidate.isNotEmpty;
        return Container(
          width: 268,
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: highlighted ? context.colors.surfaceAlt : context.colors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: highlighted ? AppColors.lime : context.colors.border,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: status.dotColor, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        status.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Text('${tasks.length}', style: TextStyle(color: context.colors.textMuted)),
                  ],
                ),
              ),
              Expanded(
                child: tasks.isEmpty
                    ? Center(
                        child: Text('—', style: TextStyle(color: context.colors.textMuted)),
                      )
                    : ListView(
                        children: [
                          for (final t in tasks)
                            _DraggableCard(task: t, onOpen: () => onOpen(t)),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DraggableCard extends StatelessWidget {
  const _DraggableCard({required this.task, required this.onOpen});
  final Task task;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final card = _CardBody(task: task);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: LongPressDraggable<Task>(
        data: task,
        feedback: Material(
          color: Colors.transparent,
          child: SizedBox(width: 240, child: _CardBody(task: task, elevated: true)),
        ),
        childWhenDragging: Opacity(opacity: 0.35, child: card),
        child: GestureDetector(onTap: onOpen, child: card),
      ),
    );
  }
}

class _CardBody extends StatelessWidget {
  const _CardBody({required this.task, this.elevated = false});
  final Task task;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: elevated ? context.colors.surfaceAlt : context.colors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            task.title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: task.priority.color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text(task.priority.label, style: TextStyle(fontSize: 11, color: context.colors.textMuted)),
              const Spacer(),
              if (task.checklistTotal > 0)
                Text(
                  '${task.checklistDone}/${task.checklistTotal}',
                  style: TextStyle(fontSize: 11, color: context.colors.textMuted),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
