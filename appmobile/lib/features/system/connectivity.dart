import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Detección de conexión (F2b). Envuelve connectivity_plus para exponer un
/// simple booleano en línea/sin conexión.
class ConnectivityService {
  ConnectivityService([Connectivity? c]) : _c = c ?? Connectivity();

  final Connectivity _c;

  Future<bool> isOnline() async {
    final results = await _c.checkConnectivity();
    return _online(results);
  }

  Stream<bool> onChange() => _c.onConnectivityChanged.map(_online);

  static bool _online(List<ConnectivityResult> results) =>
      results.any((r) => r != ConnectivityResult.none);
}

final Provider<ConnectivityService> connectivityServiceProvider =
    Provider<ConnectivityService>((ref) => ConnectivityService());

/// Estado de conexión en vivo (para el indicador y el auto-sync).
final StreamProvider<bool> onlineStatusProvider = StreamProvider<bool>((ref) {
  return ref.read(connectivityServiceProvider).onChange();
});
