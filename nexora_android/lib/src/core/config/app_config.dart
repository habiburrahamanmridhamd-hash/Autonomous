class AppConfig {
  static const String appName = 'NEXORA';
  static const String tagline = 'One World. One Platform.';
  static const String applicationId = 'com.nexora.social';

  // Override via --dart-define=API_BASE_URL=https://api.nexora.social
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  static String get wsBaseUrl {
    if (apiBaseUrl.startsWith('https://')) {
      return apiBaseUrl.replaceFirst('https://', 'wss://').replaceFirst('/api/v1', '/ws');
    }
    return apiBaseUrl.replaceFirst('http://', 'ws://').replaceFirst('/api/v1', '/ws');
  }
}
