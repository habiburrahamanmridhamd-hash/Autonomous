import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/nexora_theme.dart';
import '../../core/widgets/glass_container.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.delayed(const Duration(milliseconds: 900));
    final loggedIn = await ref.read(authProvider.notifier).checkSession();
    if (!mounted) return;
    context.go(loggedIn ? '/home' : '/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.3, -0.4),
            radius: 1.3,
            colors: [Color(0xFF1D2345), NexoraColors.bgDark],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  gradient: NexoraColors.brandGradient,
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: [
                    BoxShadow(
                      color: NexoraColors.purple.withOpacity(0.45),
                      blurRadius: 32,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    'N',
                    style: TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'NEXORA',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 4,
                  color: NexoraColors.offWhite,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'One World. One Platform.',
                style: TextStyle(color: NexoraColors.electricBlue, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int _page = 0;

  final _slides = const [
    ('Social Feeds & Pulse', 'Share stories, photos, long-form threads, and reposts in one glassmorphic stream.'),
    ('Reels & Watch Channels', 'Full-screen vertical reels and long-form creator channels built for smooth Android playback.'),
    ('Communities & Encrypted DMs', 'Public and private spaces, voice notes, and server-side AI creative assistance.'),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Skip'),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  onPageChanged: (i) => setState(() => _page = i),
                  itemCount: _slides.length,
                  itemBuilder: (_, i) {
                    final (title, body) = _slides[i];
                    return Center(
                      child: GlassContainer(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: const BoxDecoration(
                                gradient: NexoraColors.brandGradient,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                i == 0
                                    ? Icons.dynamic_feed_rounded
                                    : i == 1
                                        ? Icons.play_arrow_rounded
                                        : Icons.forum_rounded,
                                color: Colors.white,
                                size: 32,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              title,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              body,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _slides.length,
                  (i) => Container(
                    width: _page == i ? 24 : 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: _page == i ? NexoraColors.electricBlue : Colors.grey.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: () {
                    if (_page < _slides.length - 1) {
                      _controller.nextPage(duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
                    } else {
                      context.go('/login');
                    }
                  },
                  child: Text(_page < _slides.length - 1 ? 'Continue' : 'Get Started'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
