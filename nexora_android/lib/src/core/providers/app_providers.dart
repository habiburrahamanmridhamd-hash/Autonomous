import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.dark);

final lowBandwidthModeProvider = StateProvider<bool>((ref) => false);

class AuthState {
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  const AuthState({this.isAuthenticated = false, this.user});
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  AuthNotifier(this._api) : super(const AuthState());

  Future<bool> checkSession() async {
    final token = await _api.getToken();
    if (token == null) return false;
    try {
      final resp = await _api.dio.get('/users/me');
      state = AuthState(isAuthenticated: true, user: resp.data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> login(String email, String password) async {
    final resp = await _api.dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    await _api.saveTokens(resp.data['access_token'], resp.data['refresh_token']);
    state = AuthState(isAuthenticated: true, user: resp.data['user']);
  }

  Future<void> register(String username, String displayName, String email, String password) async {
    final resp = await _api.dio.post('/auth/register', data: {
      'username': username,
      'display_name': displayName,
      'email': email,
      'password': password,
    });
    await _api.saveTokens(resp.data['access_token'], resp.data['refresh_token']);
    state = AuthState(isAuthenticated: true, user: resp.data['user']);
  }

  Future<void> logout() async {
    await _api.clearTokens();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiClientProvider));
});
