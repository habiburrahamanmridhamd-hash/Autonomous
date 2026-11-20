import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/splash_onboarding_screens.dart';
import '../../features/auth/auth_screens.dart';
import '../../features/feed/home_feed_screen.dart';
import '../../features/reels/reels_screen.dart';
import '../../features/watch/watch_explore_screens.dart';
import '../../features/create/create_upload_screens.dart';
import '../../features/messages/messages_chat_screens.dart';
import '../../features/profile/profile_edit_screens.dart';
import '../../features/community/communities_studio_screens.dart';
import '../../features/settings/settings_privacy_search_notifications_screens.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegistrationScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeFeedScreen()),
      GoRoute(path: '/reels', builder: (_, __) => const ReelsScreen()),
      GoRoute(path: '/watch', builder: (_, __) => const WatchScreen()),
      GoRoute(path: '/explore', builder: (_, __) => const ExploreScreen()),
      GoRoute(path: '/create-post', builder: (_, __) => const CreatePostScreen()),
      GoRoute(path: '/upload-video', builder: (_, __) => const UploadVideoScreen()),
      GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
      GoRoute(
        path: '/chat/:id',
        builder: (_, state) => ChatDetailsScreen(
          conversationId: state.pathParameters['id'] ?? 'general',
        ),
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/edit-profile', builder: (_, __) => const EditProfileScreen()),
      GoRoute(path: '/communities', builder: (_, __) => const CommunitiesScreen()),
      GoRoute(path: '/creator-studio', builder: (_, __) => const CreatorStudioScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/privacy-center', builder: (_, __) => const PrivacyCenterScreen()),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
    ],
  );
});
