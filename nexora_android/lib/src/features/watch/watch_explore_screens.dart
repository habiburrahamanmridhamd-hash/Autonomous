import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/glass_container.dart';

class WatchScreen extends ConsumerStatefulWidget {
  const WatchScreen({super.key});

  @override
  ConsumerState<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends ConsumerState<WatchScreen> {
  List<dynamic> _videos = [];
  String _tab = 'channels';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/watch', queryParameters: {'tab': _tab});
      if (mounted) setState(() => _videos = resp.data as List<dynamic>);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NEXORA Watch')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'channels', label: Text('Channels')),
              ButtonSegment(value: 'playlists', label: Text('Playlists')),
              ButtonSegment(value: 'history', label: Text('History')),
            ],
            selected: {_tab},
            onSelectionChanged: (v) {
              setState(() => _tab = v.first);
              _load();
            },
          ),
          const SizedBox(height: 16),
          if (_videos.isEmpty)
            const GlassContainer(child: Text('No long-form videos available yet.'))
          else
            ..._videos.map((v) {
              final item = v as Map<String, dynamic>;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['title'] ?? 'Untitled Video', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('${item['channel_name'] ?? 'Creator'} · ${item['duration'] ?? '0:00'}'),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  List<dynamic> _topics = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/ai/discover');
      if (mounted) setState(() => _topics = resp.data['topics'] as List<dynamic>? ?? []);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Explore')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Smart Discovery', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 8),
                if (_topics.isEmpty)
                  const Text('Connect to the FastAPI backend to load AI-curated discovery topics.')
                else
                  ..._topics.map((t) => ListTile(title: Text(t.toString()))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
