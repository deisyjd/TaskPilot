import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Espejo de los tipos y mapas de `src/types/index.ts` del backend.

enum TaskStatus { pending, inProgress, review, scheduled, done, blocked }

extension TaskStatusX on TaskStatus {
  /// Valor tal cual lo maneja el API (con guion).
  String get api => switch (this) {
        TaskStatus.pending => 'pending',
        TaskStatus.inProgress => 'in-progress',
        TaskStatus.review => 'review',
        TaskStatus.scheduled => 'scheduled',
        TaskStatus.done => 'done',
        TaskStatus.blocked => 'blocked',
      };

  String get label => switch (this) {
        TaskStatus.pending => 'Pendiente',
        TaskStatus.inProgress => 'En proceso',
        TaskStatus.review => 'Para revisión',
        TaskStatus.scheduled => 'Publicación programada',
        TaskStatus.done => 'Publicado / Terminado',
        TaskStatus.blocked => 'Bloqueado',
      };

  Color get dotColor => switch (this) {
        TaskStatus.pending => AppColors.statusPending,
        TaskStatus.inProgress => AppColors.statusInProgress,
        TaskStatus.review => AppColors.statusReview,
        TaskStatus.scheduled => AppColors.statusScheduled,
        TaskStatus.done => AppColors.statusDone,
        TaskStatus.blocked => AppColors.statusBlocked,
      };

  static TaskStatus fromApi(String? value) => switch (value) {
        'in-progress' => TaskStatus.inProgress,
        'review' => TaskStatus.review,
        'scheduled' => TaskStatus.scheduled,
        'done' => TaskStatus.done,
        'blocked' => TaskStatus.blocked,
        _ => TaskStatus.pending,
      };
}

enum Priority { low, medium, high, urgent }

extension PriorityX on Priority {
  String get api => name;

  String get label => switch (this) {
        Priority.low => 'Baja',
        Priority.medium => 'Media',
        Priority.high => 'Alta',
        Priority.urgent => 'Urgente',
      };

  Color get color => switch (this) {
        Priority.low => AppColors.priorityLow,
        Priority.medium => AppColors.priorityMedium,
        Priority.high => AppColors.priorityHigh,
        Priority.urgent => AppColors.priorityUrgent,
      };

  static Priority fromApi(String? value) => switch (value) {
        'low' => Priority.low,
        'high' => Priority.high,
        'urgent' => Priority.urgent,
        _ => Priority.medium,
      };
}

enum TaskType {
  design,
  copy,
  publication,
  review,
  development,
  meeting,
  strategy,
  other,
}

extension TaskTypeX on TaskType {
  String get api => name;

  String get label => switch (this) {
        TaskType.design => 'Diseño',
        TaskType.copy => 'Copy',
        TaskType.publication => 'Publicación',
        TaskType.review => 'Revisión',
        TaskType.development => 'Desarrollo',
        TaskType.meeting => 'Reunión',
        TaskType.strategy => 'Estrategia',
        TaskType.other => 'Otro',
      };

  static TaskType fromApi(String? value) =>
      TaskType.values.firstWhere((t) => t.name == value, orElse: () => TaskType.other);
}
