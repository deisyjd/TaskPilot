import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
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
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(projectsProvider)),
          data: (projects) {
            if (projects.isEmpty) {
              return const EmptyView(icon: Icons.folder_open, message: 'Aún no hay proyectos');
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

  String? get _media {
    final logo = project.logoUrl;
    if (logo != null && logo.isNotEmpty) return logo;
    final cover = project.coverImageUrl;
    if (cover != null && cover.isNotEmpty) return cover;
    return null;
  }

  Widget _fallbackIcon() => Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _dot.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(Icons.folder, color: _dot),
      );

  Widget _thumb() {
    final media = _media;
    if (media == null) return _fallbackIcon();
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        AppConfig.media(media),
        width: 40,
        height: 40,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _fallbackIcon(),
      ),
    );
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
          _thumb(),
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
