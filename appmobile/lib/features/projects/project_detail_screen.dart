import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/note.dart';
import '../../data/models/project.dart';
import '../../data/models/task.dart';
import '../auth/auth_controller.dart';
import '../tasks/task_tile.dart';

/// Tareas de un proyecto. Family por projectId; se recarga al cambiar empresa.
final projectTasksProvider =
    FutureProvider.autoDispose.family<List<Task>, String>((ref, projectId) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(tasksRepositoryProvider).list(projectId: projectId);
});

/// Notas de un proyecto.
final projectNotesProvider =
    FutureProvider.autoDispose.family<List<Note>, String>((ref, projectId) async {
  return ref.read(notesRepositoryProvider).listByProject(projectId);
});

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.project});

  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(projectTasksProvider(project.id));
    final notesAsync = ref.watch(projectNotesProvider(project.id));

    return Scaffold(
      appBar: AppBar(title: Text(project.name)),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () async {
          ref.invalidate(projectTasksProvider(project.id));
          ref.invalidate(projectNotesProvider(project.id));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (project.description?.isNotEmpty == true) ...[
              Text(project.description!, style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
            ],
            const Text('Tareas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            tasksAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator(color: AppColors.lime)),
              ),
              error: (e, _) => Text('$e', style: const TextStyle(color: AppColors.textSecondary)),
              data: (tasks) {
                if (tasks.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('Sin tareas aún.', style: TextStyle(color: AppColors.textSecondary)),
                  );
                }
                return Column(
                  children: [
                    for (final t in tasks)
                      TaskTile(
                        task: t,
                        onTap: () => context.push('/task/${t.id}', extra: t),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),
            notesAsync.maybeWhen(
              data: (notes) => notes.isEmpty
                  ? const SizedBox.shrink()
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Notas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 10),
                        for (final n in notes) _NoteCard(note: n),
                      ],
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (note.title.isNotEmpty)
            Text(note.title, style: const TextStyle(fontWeight: FontWeight.w700)),
          if (note.content.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(note.content, style: const TextStyle(color: AppColors.textSecondary)),
          ],
        ],
      ),
    );
  }
}
