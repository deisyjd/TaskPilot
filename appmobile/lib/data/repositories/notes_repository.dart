import '../../core/network/api_client.dart';
import '../models/note.dart';

/// Notas de un proyecto. GET /api/notes requiere projectId.
class NotesRepository {
  NotesRepository(this._api);

  final ApiClient _api;

  Future<List<Note>> listByProject(String projectId) async {
    final res = await _api.get<List<dynamic>>(
      '/api/notes',
      query: {'projectId': projectId},
    );
    return (res.data ?? [])
        .map((e) => Note.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
