import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/glass_container.dart';

class CommunitiesScreen extends ConsumerStatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  ConsumerState<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends ConsumerState<CommunitiesScreen> {
  List<dynamic> _groups = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/communities');
      if (mounted) setState(() => _groups = resp.data as List<dynamic>);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Communities')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _groups.isEmpty
            ? [const GlassContainer(child: Text('No communities created yet.'))]
            : _groups.map((g) {
                final group = g as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GlassContainer(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(group['name'] ?? 'Community'),
                      subtitle: Text('${group['privacy'] ?? 'public'} · ${group['member_count'] ?? 0} members'),
                    ),
                  ),
                );
              }).toList(),
      ),
    );
  }
}

class CreatorStudioScreen extends ConsumerWidget {
  const CreatorStudioScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Creator Studio')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GlassContainer(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Creator Analytics & AI Tools', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              SizedBox(height: 8),
              Text('Track real post engagement, Watch retention, Reel completions, and server-side Gemini recommendations.'),
            ],
          ),
        ),
      ),
    );
  }
}
