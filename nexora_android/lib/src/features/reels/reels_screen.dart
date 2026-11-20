import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/floating_glass_nav.dart';

class ReelsScreen extends ConsumerStatefulWidget {
  const ReelsScreen({super.key});

  @override
  ConsumerState<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends ConsumerState<ReelsScreen> {
  final PageController _pageController = PageController();
  List<dynamic> _reels = [];
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    _fetchReels();
  }

  Future<void> _fetchReels() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/reels');
      if (mounted) setState(() => _reels = resp.data as List<dynamic>);
    } catch (_) {}
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.black,
      body: _reels.isEmpty
          ? const Center(child: Text('No Reels uploaded yet.', style: TextStyle(color: Colors.white)))
          : PageView.builder(
              controller: _pageController,
              scrollDirection: Axis.vertical,
              onPageChanged: (i) => setState(() => _activeIndex = i),
              itemCount: _reels.length,
              itemBuilder: (_, index) {
                final reel = _reels[index] as Map<String, dynamic>;
                return _ReelPlayerItem(
                  reel: reel,
                  isActive: index == _activeIndex,
                  onLike: () async {
                    await ref.read(apiClientProvider).dio.post('/reels/${reel['id']}/like');
                    _fetchReels();
                  },
                );
              },
            ),
      bottomNavigationBar: const FloatingGlassNav(currentIndex: 1),
    );
  }
}

class _ReelPlayerItem extends StatefulWidget {
  final Map<String, dynamic> reel;
  final bool isActive;
  final VoidCallback onLike;

  const _ReelPlayerItem({required this.reel, required this.isActive, required this.onLike});

  @override
  State<_ReelPlayerItem> createState() => _ReelPlayerItemState();
}

class _ReelPlayerItemState extends State<_ReelPlayerItem> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    final url = widget.reel['video_url'] as String?;
    if (url != null && url.isNotEmpty) {
      _controller = VideoPlayerController.networkUrl(Uri.parse(url))
        ..setLooping(true)
        ..initialize().then((_) {
          if (mounted && widget.isActive) {
            _controller?.play();
            setState(() {});
          }
        });
    }
  }

  @override
  void didUpdateWidget(covariant _ReelPlayerItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive) {
      _controller?.play();
    } else {
      _controller?.pause();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (_controller != null && _controller!.value.isInitialized)
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller!.value.size.width,
              height: _controller!.value.size.height,
              child: VideoPlayer(_controller!),
            ),
          )
        else
          Container(
            color: const Color(0xFF080B14),
            child: const Center(child: CircularProgressIndicator()),
          ),
        Positioned(
          left: 16,
          right: 84,
          bottom: 108,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('@${widget.reel['author_username'] ?? 'creator'}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 6),
              Text(widget.reel['caption'] ?? '', style: const TextStyle(color: Colors.white)),
            ],
          ),
        ),
        Positioned(
          right: 14,
          bottom: 112,
          child: Column(
            children: [
              IconButton(
                icon: const Icon(Icons.favorite_rounded, color: Colors.white, size: 30),
                onPressed: widget.onLike,
              ),
              Text('${widget.reel['likes_count'] ?? 0}', style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 14),
              IconButton(
                icon: const Icon(Icons.share_rounded, color: Colors.white, size: 28),
                onPressed: () => Share.share('Watch this Reel on NEXORA: ${widget.reel['caption']}'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
