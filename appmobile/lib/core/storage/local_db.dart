import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Base de datos local (SQLite) para el modo offline (F2b).
/// Tablas:
/// - `tasks_cache`: espejo de las tareas por empresa (lectura sin conexión).
/// - `outbox`: cola de cambios pendientes de subir cuando vuelve la conexión.
class LocalDb {
  LocalDb._();
  static final LocalDb instance = LocalDb._();

  Database? _db;

  Future<Database> get database async {
    return _db ??= await _open();
  }

  Future<Database> _open() async {
    final dir = await getDatabasesPath();
    return openDatabase(
      p.join(dir, 'wipli.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE tasks_cache(
            id TEXT PRIMARY KEY,
            company_id TEXT NOT NULL,
            updated_at TEXT,
            json TEXT NOT NULL
          )
        ''');
        await db.execute('CREATE INDEX idx_tasks_company ON tasks_cache(company_id)');
        await db.execute('''
          CREATE TABLE outbox(
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
      },
    );
  }
}
