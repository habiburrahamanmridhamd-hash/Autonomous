import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/floating_glass_nav.dart';
import '../../core/widgets/glass_container.dart';

class HomeFeedScreen extends ConsumerStatefulWidget {
  const HomeFeedScreen({super.key});

  @override
  ConsumerState<HomeFeedScreen> createState() => _HomeFeedScreenState();
}

class _HomeFeedScreenState extends ConsumerState<HomeFeedScreen> {
  String _feedMode = 'personalized';
  List<dynamic> _posts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.dio.get('/posts', queryParameters: {'mode': _feedMode});
      if (mounted) setState(() => _posts = resp.data as List<dynamic>);
    } catch (_) {
      // Keep UI responsive when backend is offline
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleLike(String postId) async {
    try {
      await ref.read(apiClientProvider).dio.post('/posts/$postId/like');
      _loadFeed();
    } catch (_) {}
  }

  Future<void> _toggleSave(String postId) async {
    try {
      await ref.read(apiClientProvider).dio.post('/posts/$postId/save');
      _loadFeed();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: const Text('NEXORA', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.5)),
        actions: [
          IconButton(icon: const Icon(Icons.search_rounded), onPressed: () => context.push('/search')),
          IconButton(icon: const Icon(Icons.notifications_none_rounded), onPressed: () => context.push('/notifications')),
          IconButton(icon: const Icon(Icons.ondemand_video_rounded), onPressed: () => context.push('/watch')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadFeed,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            Row(
              children: [
                for (final mode in ['personalized', 'trending', 'pulse'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(mode[0].toUpperCase() + mode.substring(1)),
                      selected: _feedMode == mode,
                      onSelected: (_) {
                        setState(() => _feedMode = mode);
                        _loadFeed();
                      },
                    ),
                  ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => context.push('/communities'),
                  icon: const Icon(Icons.groups_rounded, size: 18),
                  label: const Text('Groups'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_posts.isEmpty)
              GlassContainer(
                child: Column(
                  children: [
                    const Text('No posts yet in this feed.'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.go('/create-post'),
                      child: const Text('Create First Post'),
                    ),
                  ],
                ),
              )
            else
              ..._posts.map((p) {
                final post = p as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundImage: post['author_avatar'] != null
                                  ? CachedNetworkImageProvider(post['author_avatar'])
                                  : null,
                              child: post['author_avatar'] == null
                                  ? Text((post['author_name'] ?? 'U')[0])
                                  : null,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(post['author_name'] ?? 'Creator', style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text('@${post['author_username'] ?? 'user'}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.share_rounded, size: 20),
                              onPressed: () => Share.share('${post['content']} — Shared via NEXORA'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(post['content'] ?? ''),
                        if (post['media_url'] != null) ...[
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: CachedNetworkImage(
                              imageUrl: post['media_url'],
                              fit: BoxFit.cover,
                              memCacheWidth: 900,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.favorite_border_rounded, size: 20),
                              onPressed: () => _toggleLike(post['id'].toString()),
                            ),
                            Text('${post['likes_count'] ?? 0}'),
                            const SizedBox(width: 12),
                            const Icon(Icons.chat_bubble_outline_rounded, size: 19),
                            const SizedBox(width: 4),
                            Text('${post['comments_count'] ?? 0}'),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.bookmark_border_rounded, size: 20),
                              onPressed: () => _toggleSave(post['id'].toString()),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
      bottomNavigationBar: const FloatingGlassNav(currentIndex: 0),
    );
  }
}
