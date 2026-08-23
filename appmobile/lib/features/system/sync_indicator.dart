import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import 'sync_controller.dart';

/// Indicador compacto del estado offline/sincronización (F2b):
/// sin conexión · sincronizando · N pendientes · sincronizado.
class SyncIndicator extends ConsumerWidget {
  const SyncIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(syncControllerProvider);

    late final IconData icon;
    late final String label;
    late final Color color;

    if (s.syncing) {
      icon = Icons.sync;
      label = 'Sincronizando';
      color = AppColors.statusInProgress;
    } else if (!s.online) {
      icon = Icons.cloud_off;
      label = 'Sin conexión';
      color = context.colors.textMuted;
    } else if (s.pending > 0) {
      icon = Icons.cloud_upload_outlined;
      label = '${s.pending} pendiente${s.pending == 1 ? '' : 's'}';
      color = AppColors.statusReview;
    } else {
      icon = Icons.cloud_done_outlined;
      label = 'Sincronizado';
      color = AppColors.success;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
