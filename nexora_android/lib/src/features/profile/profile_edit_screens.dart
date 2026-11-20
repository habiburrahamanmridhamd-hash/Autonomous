import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/floating_glass_nav.dart';
import '../../core/widgets/glass_container.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: Text(user?['username'] ?? 'Profile'),
        actions: [
          IconButton(icon: const Icon(Icons.analytics_rounded), onPressed: () => context.push('/creator-studio')),
          IconButton(icon: const Icon(Icons.settings_rounded), onPressed: () => context.push('/settings')),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
        children: [
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user?['display_name'] ?? 'NEXORA Member',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('@${user?['username'] ?? 'guest'}'),
                const SizedBox(height: 10),
                Text(user?['bio'] ?? 'No bio added yet.'),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Text('${user?['followers_count'] ?? 0} Followers'),
                    const SizedBox(width: 16),
                    Text('${user?['following_count'] ?? 0} Following'),
                  ],
                ),
                const SizedBox(height: 14),
                OutlinedButton(
                  onPressed: () => context.push('/edit-profile'),
                  child: const Text('Edit Profile'),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: const FloatingGlassNav(currentIndex: 4),
    );
  }
}

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nameCtrl.text = user?['display_name'] ?? '';
    _bioCtrl.text = user?['bio'] ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).dio.patch('/users/me', data: {
        'display_name': _nameCtrl.text.trim(),
        'bio': _bioCtrl.text.trim(),
      });
      await ref.read(authProvider.notifier).checkSession();
      if (mounted) context.pop();
    } catch (_) {} finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GlassContainer(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Display Name')),
              const SizedBox(height: 12),
              TextField(controller: _bioCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Bio')),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving...' : 'Save Changes'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
