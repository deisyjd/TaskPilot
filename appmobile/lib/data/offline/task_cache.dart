import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import '../../core/storage/local_db.dart';
import '../models/task.dart';

/// Caché local de tareas por empresa. Permite leer sin conexión y de forma
/// instantánea. La fuente de verdad sigue siendo el backend; esto es un espejo.
class TaskCache {
  TaskCache(this._db);

  final LocalDb _db;

  Future<List<Task>> byCompany(String companyId) async {
    final db = await _db.database;
    final rows = await db.query(
      'tasks_cache',
      where: 'company_id = ?',
      whereArgs: [companyId],
    );
    return rows
        .map((r) => Task.fromJson(jsonDecode(r['json'] as String) as Map<String, dynamic>))
        .toList();
  }

  /// Reemplaza por completo la caché de una empresa con lo recibido del server.
  Future<void> replaceCompany(String companyId, List<Task> tasks) async {
    final db = await _db.database;
    await db.transaction((txn) async {
      await txn.delete('tasks_cache', where: 'company_id = ?', whereArgs: [companyId]);
      final batch = txn.batch();
      for (final t in tasks) {
        batch.insert('tasks_cache', _row(companyId, t));
      }
      await batch.commit(noResult: true);
    });
  }

  /// Elimina una tarea de la caché por id (p. ej. una tarea temporal creada
  /// offline, tras subirla y obtener la real del servidor).
  Future<void> delete(String id) async {
    final db = await _db.database;
    await db.delete('tasks_cache', where: 'id = ?', whereArgs: [id]);
  }

  /// Inserta o actualiza una sola tarea (para cambios optimistas offline).
  Future<void> upsert(String companyId, Task task) async {
    final db = await _db.database;
    await db.insert(
      'tasks_cache',
      _row(companyId, task),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Map<String, Object?> _row(String companyId, Task t) => {
        'id': t.id,
        'company_id': companyId,
        'updated_at': t.updatedAt,
        'json': jsonEncode(t.toCacheJson()),
      };
}
