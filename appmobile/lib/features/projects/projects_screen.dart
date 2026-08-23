import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/project.dart';
import '../auth/auth_controller.dart';

/// Proyectos de la empresa activa. Se recarga al cambiar de empresa.
final projectsProvider = FutureProvider.autoDispose<List<Project>>((ref) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(projectsRepositoryProvider).list();
});

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(projectsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Proyectos')),
      body: RefreshIndicator(
        color: AppColors.lime,
        onRefresh: () => ref.refresh(projectsProvider.future),
        child: projectsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.lime)),
          error: (e, _) => _Error(message: '$e', onRetry: () => ref.invalidate(projectsProvider)),
          data: (projects) {
            if (projects.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Icon(Icons.folder_open, size: 48, color: AppColors.textMuted),
                  SizedBox(height: 12),
                  Center(child: Text('Aún no hay proyectos', style: TextStyle(color: AppColors.textSecondary))),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: projects.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) => _ProjectCard(
                project: projects[i],
                onTap: () => ctx.push('/project/${projects[i].id}', extra: projects[i]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, this.onTap});
  final Project project;
  final VoidCallback? onTap;

  Color get _dot {
    final hex = project.color.replaceFirst('#', '');
    final value = int.tryParse('FF$hex', radix: 16);
    return value == null ? AppColors.lime : Color(value);
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _dot.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.folder, color: _dot),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        project.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ),
                    if (project.featured) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.star, size: 14, color: AppColors.lime),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  project.description?.isNotEmpty == true
                      ? project.description!
                      : '${project.members.length} miembro(s)',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 100),
        const Icon(Icons.cloud_off, size: 48, color: AppColors.textMuted),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
        ),
        const SizedBox(height: 16),
        Center(child: OutlinedButton(onPressed: onRetry, child: const Text('Reintentar'))),
      ],
    );
  }
}
