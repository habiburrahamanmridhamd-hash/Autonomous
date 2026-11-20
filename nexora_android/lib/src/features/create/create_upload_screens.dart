import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/permissions/permission_service.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/floating_glass_nav.dart';
import '../../core/widgets/glass_container.dart';

class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key});

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _contentCtrl = TextEditingController();
  XFile? _pickedImage;
  String _postType = 'feed';
  bool _busy = false;

  @override
  void dispose() {
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final granted = await PermissionService.requestCameraAndPhotos();
    if (!granted) return;
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (img != null && mounted) setState(() => _pickedImage = img);
  }

  Future<void> _aiAssist(String mode) async {
    setState(() => _busy = true);
    try {
      final resp = await ref.read(apiClientProvider).dio.post('/ai/assist', data: {
        'mode': mode,
        'prompt': _contentCtrl.text.trim(),
      });
      if (mounted) {
        _contentCtrl.text = resp.data['result'] ?? _contentCtrl.text;
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publish() async {
    if (_contentCtrl.text.trim().isEmpty && _pickedImage == null) return;
    setState(() => _busy = true);
    try {
      String? mediaUrl;
      if (_pickedImage != null) {
        final form = FormData.fromMap({
          'file': await MultipartFile.fromFile(_pickedImage!.path, filename: _pickedImage!.name),
        });
        final uploadResp = await ref.read(apiClientProvider).dio.post('/media/upload', data: form);
        mediaUrl = uploadResp.data['url'];
      }
      await ref.read(apiClientProvider).dio.post('/posts', data: {
        'content': _contentCtrl.text.trim(),
        'post_type': _postType,
        'media_url': mediaUrl,
      });
      if (mounted) context.go('/home');
    } catch (_) {} finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: const Text('Create'),
        actions: [
          TextButton(
            onPressed: () => context.push('/upload-video'),
            child: const Text('Upload Video'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'feed', label: Text('Post')),
              ButtonSegment(value: 'pulse', label: Text('Pulse Thread')),
              ButtonSegment(value: 'story', label: Text('Story')),
            ],
            selected: {_postType},
            onSelectionChanged: (v) => setState(() => _postType = v.first),
          ),
          const SizedBox(height: 16),
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _contentCtrl,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    hintText: 'Share a thought, thread, or story...',
                    border: InputBorder.none,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.photo_library_rounded, size: 18),
                      label: Text(_pickedImage == null ? 'Add Photo' : 'Photo Ready'),
                    ),
                    OutlinedButton(
                      onPressed: _busy ? null : () => _aiAssist('caption'),
                      child: const Text('AI Caption'),
                    ),
                    OutlinedButton(
                      onPressed: _busy ? null : () => _aiAssist('hashtags'),
                      child: const Text('AI Hashtags'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: _busy ? null : _publish,
                    child: Text(_busy ? 'Publishing...' : 'Publish'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: const FloatingGlassNav(currentIndex: 2),
    );
  }
}

class UploadVideoScreen extends ConsumerStatefulWidget {
  const UploadVideoScreen({super.key});

  @override
  ConsumerState<UploadVideoScreen> createState() => _UploadVideoScreenState();
}

class _UploadVideoScreenState extends ConsumerState<UploadVideoScreen> {
  final _titleCtrl = TextEditingController();
  XFile? _videoFile;
  String _target = 'reel';
  bool _uploading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickVideo() async {
    final granted = await PermissionService.requestVideoCapture();
    if (!granted) return;
    final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (picked != null && mounted) setState(() => _videoFile = picked);
  }

  Future<void> _upload() async {
    if (_videoFile == null) return;
    setState(() => _uploading = true);
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(_videoFile!.path, filename: _videoFile!.name),
      });
      final uploadResp = await ref.read(apiClientProvider).dio.post('/media/upload', data: form);
      await ref.read(apiClientProvider).dio.post(_target == 'reel' ? '/reels' : '/watch', data: {
        'title': _titleCtrl.text.trim(),
        'caption': _titleCtrl.text.trim(),
        'video_url': uploadResp.data['url'],
      });
      if (mounted) context.go(_target == 'reel' ? '/reels' : '/watch');
    } catch (_) {} finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Video')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GlassContainer(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'reel', label: Text('Vertical Reel')),
                  ButtonSegment(value: 'watch', label: Text('Watch Video')),
                ],
                selected: {_target},
                onSelectionChanged: (v) => setState(() => _target = v.first),
              ),
              const SizedBox(height: 16),
              TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title or Caption')),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _pickVideo,
                icon: const Icon(Icons.video_library_rounded),
                label: Text(_videoFile == null ? 'Select Video File' : _videoFile!.name),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _uploading ? null : _upload,
                  child: Text(_uploading ? 'Uploading...' : 'Publish Video'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
