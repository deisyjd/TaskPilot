import 'package:flutter_test/flutter_test.dart';
import 'package:wipli_mobile/data/models/enums.dart';
import 'package:wipli_mobile/data/models/project.dart';
import 'package:wipli_mobile/data/models/session.dart';
import 'package:wipli_mobile/data/models/task.dart';

void main() {
  group('Enums (mapeo con el API)', () {
    test('TaskStatus mapea el guion de in-progress', () {
      expect(TaskStatusX.fromApi('in-progress'), TaskStatus.inProgress);
      expect(TaskStatus.inProgress.api, 'in-progress');
      expect(TaskStatusX.fromApi('desconocido'), TaskStatus.pending);
    });

    test('Priority por defecto es medium', () {
      expect(PriorityX.fromApi(null), Priority.medium);
      expect(PriorityX.fromApi('urgent'), Priority.urgent);
    });
  });

  group('Task.fromJson', () {
    test('parsea listas ya serializadas por el backend', () {
      final task = Task.fromJson({
        'id': 't1',
        'title': 'Demo',
        'projectId': 'p1',
        'description': '',
        'status': 'review',
        'assigneeIds': ['u1', 'u2'],
        'viewerAssigneeIds': ['u2'],
        'dueDate': '2026-08-23',
        'priority': 'high',
        'type': 'development',
        'tags': ['a', 'b'],
        'checklist': [
          {'id': 'c1', 'text': 'Item', 'done': true},
        ],
        'comments': [],
      });

      expect(task.status, TaskStatus.review);
      expect(task.priority, Priority.high);
      expect(task.assigneeIds, ['u1', 'u2']);
      expect(task.tags, ['a', 'b']);
      expect(task.checklistDone, 1);
      expect(task.checklistTotal, 1);
    });
  });

  group('Project.fromJson', () {
    test('lee members y featured', () {
      final p = Project.fromJson({
        'id': 'p1',
        'name': 'Wipli',
        'color': '#DFFF5F',
        'members': ['u1'],
        'featured': true,
      });
      expect(p.name, 'Wipli');
      expect(p.members, ['u1']);
      expect(p.featured, isTrue);
    });
  });

  group('Session', () {
    test('fromLoginJson resuelve la empresa activa', () {
      final s = Session.fromLoginJson({
        'user': {
          'id': 'u1',
          'name': 'Julian',
          'email': 'j@x.com',
          'userRole': 'admin',
          'initials': 'JC',
          'color': 'bg-orange-500',
        },
        'activeCompanyId': 'c2',
        'companies': [
          {'id': 'c1', 'name': 'A', 'slug': 'a', 'color': '#111'},
          {'id': 'c2', 'name': 'B', 'slug': 'b', 'color': '#222'},
        ],
      });
      expect(s.user.isAdmin, isTrue);
      expect(s.activeCompany?.name, 'B');
    });
  });
}
