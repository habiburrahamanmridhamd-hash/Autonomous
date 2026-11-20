import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/glass_container.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final lowBandwidth = ref.watch(lowBandwidthModeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GlassContainer(
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Dark Glassmorphism Mode'),
                  value: themeMode == ThemeMode.dark,
                  onChanged: (v) => ref.read(themeModeProvider.notifier).state = v ? ThemeMode.dark : ThemeMode.light,
                ),
                SwitchListTile(
                  title: const Text('Low Bandwidth & Battery Saver'),
                  value: lowBandwidth,
                  onChanged: (v) => ref.read(lowBandwidthModeProvider.notifier).state = v,
                ),
                ListTile(
                  title: const Text('Privacy Center'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/privacy-center'),
                ),
                ListTile(
                  title: const Text('Sign Out', style: TextStyle(color: Colors.redAccent)),
                  onTap: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class PrivacyCenterScreen extends ConsumerWidget {
  const PrivacyCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Center')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GlassContainer(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('Private Account'),
                subtitle: const Text('Require approval for new followers'),
                trailing: Switch(value: false, onChanged: (_) {}),
              ),
              ListTile(
                title: const Text('Delete Account Permanently', style: TextStyle(color: Colors.redAccent)),
                onTap: () async {
                  await ref.read(apiClientProvider).dio.delete('/users/me');
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/onboarding');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _queryCtrl = TextEditingController();
  List<dynamic> _results = [];

  @override
  void dispose() {
    _queryCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/ai/search', queryParameters: {'q': _queryCtrl.text.trim()});
      if (mounted) setState(() => _results = resp.data['results'] as List<dynamic>? ?? []);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Smart Search')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _queryCtrl,
              decoration: InputDecoration(
                hintText: 'Search posts, people, reels, or ask AI...',
                suffixIcon: IconButton(icon: const Icon(Icons.search_rounded), onPressed: _search),
              ),
              onSubmitted: (_) => _search(),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (_, i) => ListTile(title: Text(_results[i].toString())),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/notifications');
      if (mounted) setState(() => _items = resp.data as List<dynamic>);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _items.isEmpty
            ? [const GlassContainer(child: Text('No notifications yet.'))]
            : _items.map((n) => ListTile(title: Text((n as Map)['message'] ?? ''))).toList(),
      ),
    );
  }
}
