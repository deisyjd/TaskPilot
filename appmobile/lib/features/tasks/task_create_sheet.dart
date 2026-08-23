import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';

/// Abre la hoja de creación de tarea en un proyecto y devuelve la tarea creada
/// (real si hay conexión, o temporal si se creó offline), o null si se canceló.
Future<Task?> showTaskCreateSheet(BuildContext context, String projectId) {
  return showModalBottomSheet<Task>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _TaskCreateSheet(projectId: projectId),
  );
}

class _TaskCreateSheet extends ConsumerStatefulWidget {
  const _TaskCreateSheet({required this.projectId});
  final String projectId;

  @override
  ConsumerState<_TaskCreateSheet> createState() => _TaskCreateSheetState();
}

class _TaskCreateSheetState extends ConsumerState<_TaskCreateSheet> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  TaskStatus _status = TaskStatus.pending;
  Priority _priority = Priority.medium;
  late DateTime _due = DateTime.now();
  bool _saving = false;

  static String _fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _due,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) setState(() => _due = picked);
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El título es obligatorio')),
      );
      return;
    }
    final companyId = ref.read(authControllerProvider).session?.activeCompanyId;
    if (companyId == null) return;
    setState(() => _saving = true);

    final fields = {
      'projectId': widget.projectId,
      'title': title,
      'description': _desc.text.trim(),
      'status': _status.api,
      'priority': _priority.api,
      'type': TaskType.other.api,
      'dueDate': _fmt(_due),
    };
    final optimistic = Task(
      id: 'local_${DateTime.now().microsecondsSinceEpoch}',
      title: title,
      projectId: widget.projectId,
      companyId: companyId,
      description: _desc.text.trim(),
      status: _status,
      assigneeIds: const [],
      dueDate: _fmt(_due),
      priority: _priority,
      type: TaskType.other,
      tags: const [],
      checklist: const [],
      comments: const [],
    );

    try {
      final created = await ref
          .read(taskMutationsProvider)
          .createTask(companyId, fields, optimistic);
      if (mounted) Navigator.of(context).pop(created);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text('Nueva tarea', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(
              controller: _title,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Título'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _desc,
              decoration: const InputDecoration(labelText: 'Descripción'),
              maxLines: 3,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<TaskStatus>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Estado'),
              dropdownColor: AppColors.surfaceAlt,
              items: [
                for (final s in TaskStatus.values)
                  DropdownMenuItem(value: s, child: Text(s.label)),
              ],
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<Priority>(
              initialValue: _priority,
              decoration: const InputDecoration(labelText: 'Prioridad'),
              dropdownColor: AppColors.surfaceAlt,
              items: [
                for (final p in Priority.values)
                  DropdownMenuItem(value: p, child: Text(p.label)),
              ],
              onChanged: (v) => setState(() => _priority = v ?? _priority),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Vence'),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_fmt(_due)),
                    const Icon(Icons.event, size: 18, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                    )
                  : const Text('Crear tarea'),
            ),
          ],
        ),
      ),
    );
  }
}
