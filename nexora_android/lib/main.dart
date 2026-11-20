import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/core/theme/nexora_theme.dart';
import 'src/core/routing/app_router.dart';
import 'src/core/providers/app_providers.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
    ),
  );
  runApp(const ProviderScope(child: NexoraApp()));
}

class NexoraApp extends ConsumerWidget {
  const NexoraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'NEXORA',
      debugShowCheckedModeBanner: false,
      theme: NexoraTheme.lightTheme,
      darkTheme: NexoraTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
