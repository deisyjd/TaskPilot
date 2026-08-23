import 'enums.dart';

/// Ítem del checklist de una tarea. Espejo de `ChecklistItem`.
class ChecklistItem {
  const ChecklistItem({
    required this.id,
    required this.text,
    required this.done,
    this.dueDate,
    this.assigneeId,
  });

  final String id;
  final String text;
  final bool done;
  final String? dueDate;
  final String? assigneeId;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) => ChecklistItem(
        id: json['id'] as String,
        text: json['text'] as String? ?? '',
        done: json['done'] as bool? ?? false,
        dueDate: json['dueDate'] as String?,
        assigneeId: json['assigneeId'] as String?,
      );

  ChecklistItem copyWith({bool? done}) => ChecklistItem(
        id: id,
        text: text,
        done: done ?? this.done,
        dueDate: dueDate,
        assigneeId: assigneeId,
      );

  /// Forma que espera el PATCH de /api/tasks/[id] (reemplaza el checklist).
  Map<String, dynamic> toJson() => {
        'text': text,
        'done': done,
        'dueDate': dueDate,
        'assigneeId': assigneeId,
      };
}

/// Comentario de una tarea. Espejo de `Comment`.
class Comment {
  const Comment({
    required this.id,
    required this.author,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final String author;
  final String text;
  final String createdAt;

  factory Comment.fromJson(Map<String, dynamic> json) => Comment(
        id: json['id'] as String,
        author: json['author'] as String? ?? '',
        text: json['text'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? '',
      );
}

/// Tarea. Espejo de `Task` (el API serializa `assigneeIds`, `viewerAssigneeIds`
/// y `tags` ya como listas — ver `serializeTask` del backend).
class Task {
  const Task({
    required this.id,
    required this.title,
    required this.projectId,
    required this.description,
    required this.status,
    required this.assigneeIds,
    required this.dueDate,
    required this.priority,
    required this.type,
    required this.tags,
    required this.checklist,
    required this.comments,
    this.companyId,
    this.viewerAssigneeIds = const [],
    this.startDate,
    this.createdAt,
    this.updatedAt,
    this.coverImageUrl,
  });

  final String id;
  final String title;
  final String projectId;
  final String? companyId;
  final String description;
  final TaskStatus status;
  final List<String> assigneeIds;
  final List<String> viewerAssigneeIds;
  final String? startDate;
  final String dueDate;
  final Priority priority;
  final TaskType type;
  final List<String> tags;
  final List<ChecklistItem> checklist;
  final List<Comment> comments;
  final String? createdAt;
  final String? updatedAt;
  final String? coverImageUrl;

  int get checklistDone => checklist.where((c) => c.done).length;
  int get checklistTotal => checklist.length;

  Task copyWith({
    String? title,
    String? description,
    TaskStatus? status,
    String? startDate,
    String? dueDate,
    Priority? priority,
    TaskType? type,
    List<ChecklistItem>? checklist,
  }) {
    return Task(
      id: id,
      title: title ?? this.title,
      projectId: projectId,
      companyId: companyId,
      description: description ?? this.description,
      status: status ?? this.status,
      assigneeIds: assigneeIds,
      viewerAssigneeIds: viewerAssigneeIds,
      startDate: startDate ?? this.startDate,
      dueDate: dueDate ?? this.dueDate,
      priority: priority ?? this.priority,
      type: type ?? this.type,
      tags: tags,
      checklist: checklist ?? this.checklist,
      comments: comments,
      createdAt: createdAt,
      updatedAt: updatedAt,
      coverImageUrl: coverImageUrl,
    );
  }

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        projectId: json['projectId'] as String? ?? '',
        companyId: json['companyId'] as String?,
        description: json['description'] as String? ?? '',
        status: TaskStatusX.fromApi(json['status'] as String?),
        assigneeIds: _stringList(json['assigneeIds']),
        viewerAssigneeIds: _stringList(json['viewerAssigneeIds']),
        startDate: json['startDate'] as String?,
        dueDate: json['dueDate'] as String? ?? '',
        priority: PriorityX.fromApi(json['priority'] as String?),
        type: TaskTypeX.fromApi(json['type'] as String?),
        tags: _stringList(json['tags']),
        checklist: (json['checklist'] as List<dynamic>? ?? [])
            .map((e) => ChecklistItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        comments: (json['comments'] as List<dynamic>? ?? [])
            .map((e) => Comment.fromJson(e as Map<String, dynamic>))
            .toList(),
        createdAt: json['createdAt'] as String?,
        updatedAt: json['updatedAt'] as String?,
        coverImageUrl: json['coverImageUrl'] as String?,
      );

  static List<String> _stringList(dynamic value) {
    if (value is List) return value.map((e) => e.toString()).toList();
    return const [];
  }
}
