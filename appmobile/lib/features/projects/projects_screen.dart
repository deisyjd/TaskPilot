import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/state_views.dart';
import '../../core/ui/user_avatar.dart';
import '../../data/models/enums.dart';
import '../../data/models/project.dart';
import '../auth/auth_controller.dart';
import '../tasks/tasks_providers.dart';

/// Proyectos de la empresa activa. Se recarga al cambiar de empresa.
final projectsProvider = FutureProvider.autoDispose<List<Project>>((ref) async {
  ref.watch(authControllerProvider.select((s) => s.session?.activeCompanyId));
  return ref.read(projectsRepositoryProvider).list();
});

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final projectsAsync = ref.watch(projectsProvider);
    // Progreso por proyecto = tareas hechas / total (de la caché de la empresa).
    final tasks = ref.watch(companyTasksProvider).valueOrNull ?? const [];
    final done = <String, int>{};
    final total = <String, int>{};
    for (final t in tasks) {
      total[t.projectId] = (total[t.projectId] ?? 0) + 1;
      if (t.status == TaskStatus.done) done[t.projectId] = (done[t.projectId] ?? 0) + 1;
    }
    double pct(String id) {
      final tt = total[id] ?? 0;
      return tt == 0 ? 0 : (done[id] ?? 0) / tt;
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.lime,
          onRefresh: () => ref.refresh(projectsProvider.future),
          child: projectsAsync.when(
            loading: () => const LoadingView(),
            error: (e, _) => ErrorView(message: '$e', onRetry: () => ref.invalidate(projectsProvider)),
            data: (all) {
              final filtered = _query.isEmpty
                  ? all
                  : all.where((p) => p.name.toLowerCase().contains(_query.toLowerCase())).toList();
              final favs = filtered.where((p) => p.featured).toList();
              final rest = filtered.where((p) => !p.featured).toList();

              return ListView(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 96),
                children: [
                  _Header(onSearch: (v) => setState(() => _query = v)),
                  const SizedBox(height: 16),
                  if (filtered.isEmpty)
                    const EmptyView(icon: Icons.folder_open, message: 'Sin proyectos', scrollable: false),
                  if (favs.isNotEmpty) ...[
                    _sectionLabel(context, 'FAVORITOS'),
                    const SizedBox(height: 10),
                    for (final p in favs)
                      _ProjectCard(project: p, pct: pct(p.id), dark: true),
                  ],
                  if (rest.isNotEmpty) ...[
                    _sectionLabel(context, 'TODOS · ${rest.length}'),
                    const SizedBox(height: 10),
                    for (final p in rest)
                      _ProjectCard(project: p, pct: pct(p.id), dark: false),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String text) => Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
          color: context.colors.textMuted,
        ),
      );
}

class _Header extends StatelessWidget {
  const _Header({required this.onSearch});
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(22)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Proyectos',
            style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          TextField(
            onChanged: onSearch,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Buscar proyecto…',
              hintStyle: const TextStyle(color: Colors.white38),
              prefixIcon: const Icon(Icons.search, color: Colors.white38, size: 20),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.08),
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(99),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(99),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(99),
                borderSide: const BorderSide(color: AppColors.lime, width: 1.2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.pct, required this.dark});

  final Project project;
  final double pct;
  final bool dark;

  String get _initials {
    final n = project.name.trim();
    if (n.isEmpty) return '?';
    final parts = n.split(RegExp(r'\s+'));
    if (parts.length == 1) return parts.first.substring(0, parts.first.length >= 2 ? 2 : 1);
    return (parts[0][0] + parts[1][0]);
  }

  @override
  Widget build(BuildContext context) {
    final cardColor = dark ? AppColors.ink : context.colors.surface;
    final nameColor = dark ? Colors.white : context.colors.textPrimary;
    final subColor = dark ? Colors.white54 : context.colors.textMuted;
    final track = dark ? Colors.white.withValues(alpha: 0.14) : context.colors.surfaceAlt;
    final complete = pct >= 0.999;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: () => context.push('/project/${project.id}', extra: project),
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: dark ? null : Border.all(color: context.colors.border),
            ),
            child: Row(
              children: [
                UserAvatar(initials: _initials.toUpperCase(), size: 44, primary: dark),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: nameColor, fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${project.members.length} miembro(s)',
                        style: TextStyle(color: subColor, fontSize: 12),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(99),
                              child: LinearProgressIndicator(
                                value: pct,
                                minHeight: 6,
                                backgroundColor: track,
                                valueColor: const AlwaysStoppedAnimation(AppColors.lime),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          complete
                              ? Text(
                                  'W',
                                  style: TextStyle(
                                    color: dark ? AppColors.lime : AppColors.ink,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                  ),
                                )
                              : Text(
                                  '${(pct * 100).round()}%',
                                  style: TextStyle(
                                    color: dark ? AppColors.lime : nameColor,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
