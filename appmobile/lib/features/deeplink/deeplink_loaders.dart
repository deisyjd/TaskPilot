import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/ui/state_views.dart';
import '../chat/chat_providers.dart';
import '../chat/chat_screen.dart';
import '../projects/project_detail_screen.dart';
import '../projects/projects_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_providers.dart';

/// Cargadores para deep links (F5): cuando se navega a un detalle por URL o
/// desde una notificación no se tiene el objeto en `extra`, así que se resuelve
/// por id contra el provider correspondiente.

class TaskByIdScreen extends ConsumerWidget {
  const TaskByIdScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyTasksProvider);
    return async.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(message: '$e', onRetry: () => ref.invalidate(companyTasksProvider)),
      ),
      data: (tasks) {
        for (final t in tasks) {
          if (t.id == id) return TaskDetailScreen(task: t);
        }
        return Scaffold(
          appBar: AppBar(),
          body: const EmptyView(
            icon: Icons.search_off,
            message: 'Tarea no encontrada',
            scrollable: false,
          ),
        );
      },
    );
  }
}

class ProjectByIdScreen extends ConsumerWidget {
  const ProjectByIdScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(projectsProvider);
    return async.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(message: '$e', onRetry: () => ref.invalidate(projectsProvider)),
      ),
      data: (projects) {
        for (final p in projects) {
          if (p.id == id) return ProjectDetailScreen(project: p);
        }
        return Scaffold(
          appBar: AppBar(),
          body: const EmptyView(
            icon: Icons.search_off,
            message: 'Proyecto no encontrado',
            scrollable: false,
          ),
        );
      },
    );
  }
}

class ChatByIdScreen extends ConsumerWidget {
  const ChatByIdScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider);
    return async.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(message: '$e', onRetry: () => ref.invalidate(conversationsProvider)),
      ),
      data: (conversations) {
        for (final c in conversations) {
          if (c.id == id) return ChatScreen(conversation: c);
        }
        return Scaffold(
          appBar: AppBar(),
          body: const EmptyView(
            icon: Icons.search_off,
            message: 'Conversación no encontrada',
            scrollable: false,
          ),
        );
      },
    );
  }
}
