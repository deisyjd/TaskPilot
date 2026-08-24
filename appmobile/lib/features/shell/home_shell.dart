import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/app_toast.dart';
import '../../data/models/message.dart';
import '../auth/auth_controller.dart';
import '../board/kanban_screen.dart';
import '../chat/chat_providers.dart';
import '../chat/conversations_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../profile/profile_screen.dart';
import '../projects/projects_screen.dart';
import '../users/users_providers.dart';

/// Contenedor principal tras el login. Barra inferior **flotante negra** (del
/// diseño Wipli): activo en lima, siempre visible.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _tabs = [
    DashboardScreen(),
    KanbanScreen(),
    ProjectsScreen(),
    ConversationsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadCountProvider);

    // Toast in-app al llegar un mensaje en tiempo real (de otra persona y de una
    // conversación que no estás viendo).
    ref.listen<AsyncValue<Message>>(realtimeMessagesProvider, (_, next) {
      next.whenData((msg) {
        final myId = ref.read(authControllerProvider).session?.user.id;
        if (msg.senderId == myId || msg.conversationId == activeConversationId) return;
        final name = ref.read(usersByIdProvider)[msg.senderId]?.name ?? 'Nuevo mensaje';
        final preview = msg.text.isNotEmpty ? msg.text : '📎 Adjunto';
        showAppToast(
          context,
          title: name,
          message: preview,
          onTap: () => context.push('/chat/${msg.conversationId}'),
        );
      });
    });

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: SafeArea(
        child: Container(
          height: 66,
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            color: AppColors.ink,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.22),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              _NavItem(index: 0, current: _index, icon: Icons.dashboard_outlined, active: Icons.dashboard, label: 'Inicio', onTap: _go),
              _NavItem(index: 1, current: _index, icon: Icons.view_kanban_outlined, active: Icons.view_kanban, label: 'Tablero', onTap: _go),
              _NavItem(index: 2, current: _index, icon: Icons.folder_outlined, active: Icons.folder, label: 'Proyectos', onTap: _go),
              _NavItem(index: 3, current: _index, icon: Icons.forum_outlined, active: Icons.forum, label: 'Chat', onTap: _go, badge: unread),
              _NavItem(index: 4, current: _index, icon: Icons.person_outline, active: Icons.person, label: 'Perfil', onTap: _go),
            ],
          ),
        ),
      ),
    );
  }

  void _go(int i) => setState(() => _index = i);
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.index,
    required this.current,
    required this.icon,
    required this.active,
    required this.label,
    required this.onTap,
    this.badge = 0,
  });

  final int index;
  final int current;
  final IconData icon;
  final IconData active;
  final String label;
  final ValueChanged<int> onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    final isActive = current == index;
    Widget iconWidget = Icon(
      isActive ? active : icon,
      size: 22,
      color: isActive ? AppColors.ink : Colors.white70,
    );
    if (badge > 0) {
      iconWidget = Badge(
        label: Text(badge > 99 ? '99+' : '$badge'),
        backgroundColor: AppColors.danger,
        child: iconWidget,
      );
    }
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        borderRadius: BorderRadius.circular(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: isActive ? AppColors.lime : Colors.transparent,
                borderRadius: BorderRadius.circular(13),
              ),
              child: iconWidget,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isActive ? AppColors.lime : Colors.white54,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
