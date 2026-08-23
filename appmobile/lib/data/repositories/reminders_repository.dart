import '../../core/network/api_client.dart';
import '../models/reminder.dart';

/// Recordatorios de la empresa activa. GET /api/reminders.
class RemindersRepository {
  RemindersRepository(this._api);

  final ApiClient _api;

  Future<List<Reminder>> list() async {
    final res = await _api.get<List<dynamic>>('/api/reminders');
    return (res.data ?? [])
        .map((e) => Reminder.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
