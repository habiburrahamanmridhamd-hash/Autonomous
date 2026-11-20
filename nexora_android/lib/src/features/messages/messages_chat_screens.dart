import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/config/app_config.dart';
import '../../core/permissions/permission_service.dart';
import '../../core/providers/app_providers.dart';
import '../../core/widgets/floating_glass_nav.dart';
import '../../core/widgets/glass_container.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<dynamic> _conversations = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/messages/conversations');
      if (mounted) setState(() => _conversations = resp.data as List<dynamic>);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      appBar: AppBar(title: const Text('Messages')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
        children: _conversations.isEmpty
            ? [
                const GlassContainer(
                  child: Text('No conversations yet. Start a DM or group chat from any user profile.'),
                ),
              ]
            : _conversations.map((c) {
                final conv = c as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GlassContainer(
                    onTap: () => context.push('/chat/${conv['id']}'),
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(child: Icon(Icons.person_rounded)),
                      title: Text(conv['title'] ?? 'Direct Message'),
                      subtitle: Text(conv['last_message'] ?? ''),
                    ),
                  ),
                );
              }).toList(),
      ),
      bottomNavigationBar: const FloatingGlassNav(currentIndex: 3),
    );
  }
}

class ChatDetailsScreen extends ConsumerStatefulWidget {
  final String conversationId;
  const ChatDetailsScreen({super.key, required this.conversationId});

  @override
  ConsumerState<ChatDetailsScreen> createState() => _ChatDetailsScreenState();
}

class _ChatDetailsScreenState extends ConsumerState<ChatDetailsScreen> {
  final _msgCtrl = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  WebSocketChannel? _channel;

  @override
  void initState() {
    super.initState();
    _connectWs();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final resp = await ref.read(apiClientProvider).dio.get('/messages/${widget.conversationId}');
      if (mounted) {
        setState(() {
          _messages.addAll((resp.data as List<dynamic>).cast<Map<String, dynamic>>());
        });
      }
    } catch (_) {}
  }

  void _connectWs() {
    final userId = ref.read(authProvider).user?['id']?.toString() ?? 'guest';
    _channel = WebSocketChannel.connect(Uri.parse('${AppConfig.wsBaseUrl}/$userId'));
    _channel?.stream.listen((event) {
      final data = jsonDecode(event as String) as Map<String, dynamic>;
      if (data['conversation_id'] == widget.conversationId && mounted) {
        setState(() => _messages.add(data));
      }
    });
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();
    await ref.read(apiClientProvider).dio.post('/messages/${widget.conversationId}', data: {
      'content': text,
      'message_type': 'text',
    });
  }

  @override
  void dispose() {
    _channel?.sink.close();
    _msgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: GlassContainer(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Text(m['content'] ?? ''),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.mic_rounded),
                    onPressed: () => PermissionService.requestMicrophone(),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(hintText: 'Message...'),
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.send_rounded), onPressed: _send),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
