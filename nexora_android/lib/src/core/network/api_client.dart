import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class ApiClient {
  static const _tokenKey = 'nexora_access_token';
  static const _refreshKey = 'nexora_refresh_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  late final Dio dio;

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 25),
        headers: {'Accept': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (err, handler) async {
          if (err.response?.statusCode == 401) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              final token = await _storage.read(key: _tokenKey);
              err.requestOptions.headers['Authorization'] = 'Bearer $token';
              final response = await dio.fetch(err.requestOptions);
              return handler.resolve(response);
            }
          }
          handler.next(err);
        },
      ),
    );
  }

  Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: _tokenKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
  }

  Future<bool> _tryRefreshToken() async {
    final refresh = await _storage.read(key: _refreshKey);
    if (refresh == null || refresh.isEmpty) return false;
    try {
      final resp = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
          .post('/auth/refresh', data: {'refresh_token': refresh});
      await saveTokens(resp.data['access_token'], resp.data['refresh_token']);
      return true;
    } catch (_) {
      await clearTokens();
      return false;
    }
  }
}
