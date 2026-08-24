import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../data/models/enums.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';
import '../projects/projects_screen.dart';
import '../tasks/tasks_providers.dart';

/// Reportes (diseño Wipli): header negro + gráfico de tareas por estado
/// (offline) + envío por correo con selección de proyectos.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyTasksProvider);
    return Scaffold(
      appBar: AppBar(backgroundColor: context.colors.background, elevation: 0),
      body: async.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
        data: (tasks) => _Body(tasks: tasks),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.tasks});
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final counts = <TaskStatus, int>{
      for (final s in TaskStatus.values) s: tasks.where((t) => t.status == s).length,
    };
    final total = tasks.length;
    final max = counts.values.fold<int>(0, (a, b) => a > b ? a : b);

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Reportes', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  SizedBox(height: 4),
                  Text('Resumen de la empresa', style: TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
              Text('$total', style: const TextStyle(color: AppColors.lime, fontSize: 40, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        const SizedBox(height: 16),
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
              const Text('Tareas por estado', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              for (final s in TaskStatus.values)
                _BarRow(label: s.label, value: counts[s] ?? 0, max: max),
            ],
          ),
        ),
        const SizedBox(height: 22),
        ElevatedButton.icon(
          onPressed: () => _openSendSheet(context),
          icon: const Icon(Icons.mail_outline),
          label: const Text('Enviar reporte por correo'),
        ),
      ],
    );
  }

  void _openSendSheet(BuildContext context) => showSendReportSheet(context);
}

/// Abre la hoja de envío de reporte. [initialProjectIds] preselecciona
/// proyectos (p. ej. al enviar desde el detalle de un proyecto).
void showSendReportSheet(BuildContext context, {List<String> initialProjectIds = const []}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: context.colors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _SendReportSheet(initialProjectIds: initialProjectIds),
  );
}

class _BarRow extends StatelessWidget {
  const _BarRow({required this.label, required this.value, required this.max});

  final String label;
  final int value;
  final int max;

  @override
  Widget build(BuildContext context) {
    final factor = max == 0 ? 0.0 : value / max;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          SizedBox(
            width: 104,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: context.colors.textSecondary),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: factor == 0 ? 0.0 : (0.06 + 0.94 * factor).clamp(0.0, 1.0),
                minHeight: 18,
                backgroundColor: context.colors.surfaceAlt,
                valueColor: const AlwaysStoppedAnimation(AppColors.lime),
              ),
            ),
          ),
          SizedBox(
            width: 34,
            child: Text(
              '$value',
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _SendReportSheet extends ConsumerStatefulWidget {
  const _SendReportSheet({this.initialProjectIds = const []});
  final List<String> initialProjectIds;

  @override
  ConsumerState<_SendReportSheet> createState() => _SendReportSheetState();
}

class _SendReportSheetState extends ConsumerState<_SendReportSheet> {
  late final TextEditingController _emails =
      TextEditingController(text: ref.read(authControllerProvider).session?.user.email ?? '');
  late DateTime _start = DateTime(DateTime.now().year, DateTime.now().month, 1);
  late DateTime _end = DateTime.now();
  final _formats = <String>{'mailing'};
  late final Set<String> _projectIds = {...widget.initialProjectIds}; // vacío = todos
  bool _sending = false;

  static String _fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _emails.dispose();
    super.dispose();
  }

  Future<void> _pick(bool isStart) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _start : _end,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) setState(() => isStart ? _start = picked : _end = picked);
  }

  Future<void> _send() async {
    final emails = _emails.text.split(RegExp(r'[,;\s]+')).where((e) => e.contains('@')).toList();
    if (emails.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingresa al menos un correo válido')),
      );
      return;
    }
    if (_start.isAfter(_end)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La fecha inicial no puede ser mayor que la final')),
      );
      return;
    }
    setState(() => _sending = true);
    try {
      final count = await ref.read(reportsRepositoryProvider).send(
            start: _fmt(_start),
            end: _fmt(_end),
            emails: emails,
            formats: _formats.toList(),
            projectIds: _projectIds.toList(),
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reporte enviado ($count tareas) a ${emails.length} correo(s)')),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _sending = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final projects = ref.watch(projectsProvider).valueOrNull ?? const [];
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
                decoration: BoxDecoration(color: context.colors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('Enviar reporte', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(
              controller: _emails,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Correos (separados por coma)',
                hintText: 'ana@empresa.com, luis@empresa.com',
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _DateField(label: 'Desde', value: _fmt(_start), onTap: () => _pick(true))),
                const SizedBox(width: 12),
                Expanded(child: _DateField(label: 'Hasta', value: _fmt(_end), onTap: () => _pick(false))),
              ],
            ),
            const SizedBox(height: 16),
            _label('Proyectos'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilterChip(
                  label: const Text('Todos'),
                  selected: _projectIds.isEmpty,
                  onSelected: (_) => setState(() => _projectIds.clear()),
                  selectedColor: AppColors.lime.withValues(alpha: 0.25),
                ),
                for (final p in projects)
                  FilterChip(
                    label: Text(p.name),
                    selected: _projectIds.contains(p.id),
                    onSelected: (on) => setState(() {
                      if (on) {
                        _projectIds.add(p.id);
                      } else {
                        _projectIds.remove(p.id);
                      }
                    }),
                    selectedColor: AppColors.lime.withValues(alpha: 0.25),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _label('Formato'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _FormatChip(label: 'Correo', value: 'mailing', selected: _formats, onChanged: _toggleFormat),
                _FormatChip(label: 'PDF', value: 'pdf', selected: _formats, onChanged: _toggleFormat),
                _FormatChip(label: 'Excel', value: 'excel', selected: _formats, onChanged: _toggleFormat),
              ],
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _sending ? null : _send,
              child: _sending
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                    )
                  : Text(
                      _projectIds.isEmpty
                          ? 'Enviar (todos los proyectos)'
                          : 'Enviar (${_projectIds.length} proyecto(s))',
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: TextStyle(fontWeight: FontWeight.w700, color: context.colors.textSecondary),
      );

  void _toggleFormat(String value, bool on) {
    setState(() {
      if (on) {
        _formats.add(value);
      } else if (_formats.length > 1) {
        _formats.remove(value);
      }
    });
  }
}

class _DateField extends StatelessWidget {
  const _DateField({required this.label, required this.value, required this.onTap});
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(value),
      ),
    );
  }
}

class _FormatChip extends StatelessWidget {
  const _FormatChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onChanged,
  });

  final String label;
  final String value;
  final Set<String> selected;
  final void Function(String value, bool on) onChanged;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected.contains(value),
      onSelected: (on) => onChanged(value, on),
      selectedColor: AppColors.lime.withValues(alpha: 0.25),
    );
  }
}
