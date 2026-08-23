/// Recordatorio. Espejo de `Reminder` (el backend agrega projectName/color).
class Reminder {
  const Reminder({
    required this.id,
    required this.projectId,
    required this.projectName,
    required this.projectColor,
    required this.title,
    required this.dueDate,
    required this.done,
    this.dueTime,
    this.assigneeId,
    this.createdBy,
    this.createdAt,
  });

  final String id;
  final String projectId;
  final String projectName;
  final String projectColor;
  final String title;
  final String dueDate;
  final bool done;
  final String? dueTime;
  final String? assigneeId;
  final String? createdBy;
  final String? createdAt;

  factory Reminder.fromJson(Map<String, dynamic> json) => Reminder(
        id: json['id'] as String,
        projectId: json['projectId'] as String? ?? '',
        projectName: json['projectName'] as String? ?? '',
        projectColor: json['projectColor'] as String? ?? '#6366f1',
        title: json['title'] as String? ?? '',
        dueDate: json['dueDate'] as String? ?? '',
        done: json['done'] as bool? ?? false,
        dueTime: json['dueTime'] as String?,
        assigneeId: json['assigneeId'] as String?,
        createdBy: json['createdBy'] as String?,
        createdAt: json['createdAt'] as String?,
      );
}
