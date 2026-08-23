import 'dart:convert';

import '../../core/storage/local_db.dart';

/// Tipo de cambio pendiente de subir.
enum OutboxOpType { createTask, updateStatus, setChecklist, updateFields }

/// Un cambio hecho sin conexión, pendiente de enviar al backend.
/// [payload] es exactamente el cuerpo del PATCH /api/tasks/:id.
class OutboxOp {
  const OutboxOp({
    required this.id,
    required this.taskId,
    required this.type,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String taskId;
  final OutboxOpType type;
  final Map<String, dynamic> payload;
  final String createdAt;

  Map<String, Object?> toRow() => {
        'id': id,
        'task_id': taskId,
        'type': type.name,
        'payload': jsonEncode(payload),
        'created_at': createdAt,
      };

  factory OutboxOp.fromRow(Map<String, Object?> row) => OutboxOp(
        id: row['id'] as String,
        taskId: row['task_id'] as String,
        type: OutboxOpType.values.firstWhere(
          (t) => t.name == row['type'],
          orElse: () => OutboxOpType.updateFields,
        ),
        payload: jsonDecode(row['payload'] as String) as Map<String, dynamic>,
        createdAt: row['created_at'] as String,
      );
}

/// Cola persistente de cambios offline.
class OutboxStore {
  OutboxStore(this._db);

  final LocalDb _db;

  Future<void> add(OutboxOp op) async {
    final db = await _db.database;
    await db.insert('outbox', op.toRow());
  }

  Future<List<OutboxOp>> all() async {
    final db = await _db.database;
    final rows = await db.query('outbox', orderBy: 'created_at ASC');
    return rows.map(OutboxOp.fromRow).toList();
  }

  Future<Set<String>> pendingTaskIds() async {
    final ops = await all();
    return ops.map((o) => o.taskId).toSet();
  }

  Future<int> count() async {
    final db = await _db.database;
    final rows = await db.query('outbox', columns: ['id']);
    return rows.length;
  }

  Future<void> remove(String id) async {
    final db = await _db.database;
    await db.delete('outbox', where: 'id = ?', whereArgs: [id]);
  }
}
