import 'package:flutter_test/flutter_test.dart';
import 'package:wipli_mobile/data/models/enums.dart';
import 'package:wipli_mobile/data/models/task.dart';
import 'package:wipli_mobile/data/offline/outbox.dart';
import 'package:wipli_mobile/data/offline/sync_merge.dart';

Task _task(
  String id, {
  TaskStatus status = TaskStatus.pending,
  String? updatedAt,
}) {
  return Task(
    id: id,
    title: 'T$id',
    projectId: 'p1',
    description: '',
    status: status,
    assigneeIds: const ['u1'],
    dueDate: '2026-08-23',
    priority: Priority.medium,
    type: TaskType.other,
    tags: const ['x'],
    checklist: const [ChecklistItem(id: 'c1', text: 'a', done: false)],
    comments: const [],
    updatedAt: updatedAt,
  );
}

void main() {
  group('Cache roundtrip', () {
    test('toCacheJson → fromJson conserva los campos', () {
      final original = _task('1', status: TaskStatus.inProgress);
      final restored = Task.fromJson(original.toCacheJson());
      expect(restored.id, '1');
      expect(restored.status, TaskStatus.inProgress);
      expect(restored.assigneeIds, ['u1']);
      expect(restored.tags, ['x']);
      expect(restored.checklist.length, 1);
      expect(restored.checklist.first.text, 'a');
    });
  });

  group('Outbox', () {
    test('toRow → fromRow conserva payload y tipo', () {
      const op = OutboxOp(
        id: 'op1',
        taskId: 't1',
        type: OutboxOpType.updateStatus,
        payload: {'status': 'done'},
        createdAt: '2026-08-23T10:00:00.000',
      );
      final restored = OutboxOp.fromRow(op.toRow());
      expect(restored.id, 'op1');
      expect(restored.type, OutboxOpType.updateStatus);
      expect(restored.payload['status'], 'done');
    });
  });

  group('mergeTasks (conflictos, LWW)', () {
    test('una tarea con cambio pendiente conserva la versión local', () {
      final server = [_task('1', status: TaskStatus.pending)];
      final local = [_task('1', status: TaskStatus.done)];
      final merged = mergeTasks(server: server, local: local, pendingTaskIds: {'1'});
      expect(merged.single.status, TaskStatus.done); // gana local
    });

    test('sin cambio pendiente toma la versión del servidor', () {
      final server = [_task('1', status: TaskStatus.review)];
      final local = [_task('1', status: TaskStatus.done)];
      final merged = mergeTasks(server: server, local: local, pendingTaskIds: {});
      expect(merged.single.status, TaskStatus.review); // gana server
    });

    test('lo local más reciente por timestamp gana aunque no esté pendiente', () {
      final server = [_task('1', status: TaskStatus.pending, updatedAt: '2026-08-20T00:00:00.000')];
      final local = [_task('1', status: TaskStatus.done, updatedAt: '2026-08-23T00:00:00.000')];
      final merged = mergeTasks(server: server, local: local, pendingTaskIds: {});
      expect(merged.single.status, TaskStatus.done);
    });

    test('una tarea creada localmente y pendiente se agrega al resultado', () {
      final server = [_task('1')];
      final local = [_task('1'), _task('2')];
      final merged = mergeTasks(server: server, local: local, pendingTaskIds: {'2'});
      expect(merged.map((t) => t.id), containsAll(['1', '2']));
    });
  });
}
