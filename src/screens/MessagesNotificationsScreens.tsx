import React, { useRef, useState } from 'react';
import { ArrowLeft, Bell, CheckCheck, Image as ImageIcon, Mic, Send, Square, Users } from 'lucide-react';
import { UserAvatar } from '../components/NexoraBrand';
import { apiFetch, formatRelativeTime, uploadMediaFile } from '../lib/api';
import { Conversation, NotificationItem, ScreenId, UserProfile } from '../types';

export function MessagesView({
  conversations,
  users,
  currentUser,
  token,
  onSelectConversation,
  onRefresh,
  onNavigate,
  onNotify,
}: {
  conversations: Conversation[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  token: string | null;
  onSelectConversation: (id: string) => void;
  onRefresh: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!token || !currentUser) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center mb-24">
        <h2 className="font-display text-xl font-bold mb-2">Private & Group Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Sign in to message creators, share images, and send voice notes.</p>
        <button onClick={() => onNavigate('login')} className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold">
          Sign In
        </button>
      </div>
    );
  }

  const otherUsers = users.filter((u) => u.id !== currentUser.id);

  async function startChat(isGroup: boolean) {
    if (selectedIds.length === 0) {
      onNotify('Select at least one person.');
      return;
    }
    const conv = await apiFetch<Conversation>(
      '/api/conversations',
      {
        method: 'POST',
        body: JSON.stringify({
          participantIds: selectedIds,
          isGroup,
          title: isGroup ? groupTitle || 'Group Chat' : 'Direct Message',
        }),
      },
      token
    );
    setSelectedIds([]);
    setGroupTitle('');
    onRefresh();
    onSelectConversation(conv.id);
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Messages</h2>

      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Start Direct Message or Group Chat</div>
        {otherUsers.length === 0 ? (
          <p className="text-xs text-slate-500">Register a second account in another session to chat with other users, or message yourself via group chat.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {otherUsers.map((u) => {
              const active = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    setSelectedIds((prev) => (active ? prev.filter((id) => id !== u.id) : [...prev, u.id]))
                  }
                  className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium border ${
                    active
                      ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                      : 'border-slate-200 dark:border-white/15'
                  }`}
                >
                  @{u.username}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Group name (optional for DMs)..."
            className="flex-1 min-w-[180px] min-h-[40px] px-3 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-xs"
          />
          <button
            onClick={() => startChat(selectedIds.length > 1 || Boolean(groupTitle.trim()))}
            className="px-4 min-h-[40px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
          >
            Start Chat
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {conversations.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No active conversations yet.</div>
        ) : (
          conversations.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const title = c.isGroup
              ? c.title
              : c.participantUsers?.find((u) => u.id !== currentUser.id)?.displayName || c.title;
            return (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className="w-full text-left glass-panel rounded-2xl p-4 flex items-center gap-3 hover:border-[#38BDF8]/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#38BDF8]/25 to-[#8B5CF6]/25 flex items-center justify-center shrink-0">
                  {c.isGroup ? <Users className="w-5 h-5 text-[#38BDF8]" /> : <UserAvatar name={title} size={42} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{title}</span>
                    {last && <span className="text-xs text-slate-500">{formatRelativeTime(last.createdAt)}</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {last ? (last.type === 'voice' ? 'Voice message' : last.type === 'image' ? 'Image attachment' : last.content) : 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ChatDetailsView({
  conversation,
  currentUser,
  token,
  onBack,
  onRefresh,
  onNotify,
}: {
  conversation: Conversation | null;
  currentUser: UserProfile | null;
  token: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!conversation || !currentUser || !token) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <button onClick={onBack} className="text-xs text-[#38BDF8] mb-2">Back to Messages</button>
        <p className="text-sm">Select a conversation to begin.</p>
      </div>
    );
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    await apiFetch(
      `/api/conversations/${conversation!.id}/messages`,
      { method: 'POST', body: JSON.stringify({ type: 'text', content: msg }) },
      token
    );
    onRefresh();
  }

  async function sendImage(file: File) {
    const up = await uploadMediaFile(file, file.name, token!);
    await apiFetch(
      `/api/conversations/${conversation!.id}/messages`,
      { method: 'POST', body: JSON.stringify({ type: 'image', content: file.name, mediaUrl: up.url }) },
      token
    );
    onRefresh();
  }

  async function toggleVoiceRecord() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const up = await uploadMediaFile(blob, 'voice-note.webm', token!);
        await apiFetch(
          `/api/conversations/${conversation!.id}/messages`,
          { method: 'POST', body: JSON.stringify({ type: 'voice', content: 'Voice message', mediaUrl: up.url }) },
          token
        );
        onRefresh();
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      onNotify('Microphone permission denied or unavailable.');
    }
  }

  return (
    <div className="glass-panel rounded-3xl flex flex-col h-[74vh] mb-24 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
        <button onClick={onBack} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-semibold text-sm">{conversation.title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{conversation.participants.length} participants</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.messages.map((m) => {
          const mine = m.senderId === currentUser.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? 'bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white'
                    : 'bg-slate-100 dark:bg-white/10'
                }`}
              >
                {m.type === 'image' && m.mediaUrl && (
                  <img src={m.mediaUrl} alt="Shared" className="rounded-xl max-h-56 mb-2 object-cover" />
                )}
                {m.type === 'voice' && m.mediaUrl && (
                  <audio controls src={m.mediaUrl} className="max-w-[230px] mb-1" />
                )}
                <p>{m.content}</p>
                <div className={`text-[10px] mt-1 ${mine ? 'text-white/75' : 'text-slate-500'}`}>
                  {formatRelativeTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendText} className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
        <label className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
          <ImageIcon className="w-5 h-5 text-[#38BDF8]" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendImage(f);
            }}
          />
        </label>
        <button
          type="button"
          onClick={toggleVoiceRecord}
          aria-label={recording ? 'Stop recording' : 'Record voice message'}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${
            recording ? 'bg-rose-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          {recording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5 text-[#8B5CF6]" />}
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />
        <button
          type="submit"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#8B5CF6] text-white"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export function NotificationsView({
  notifications,
  token,
  onRefresh,
}: {
  notifications: NotificationItem[];
  token: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Notifications</h2>
        {token && notifications.some((n) => !n.isRead) && (
          <button
            onClick={async () => {
              await apiFetch('/api/notifications/read-all', { method: 'POST' }, token);
              onRefresh();
            }}
            className="px-3.5 py-2 min-h-[40px] rounded-xl glass-panel text-xs font-medium flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-[#38BDF8]" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-panel rounded-2xl p-4 flex items-center justify-between gap-3 ${
                n.isRead ? 'opacity-75' : 'border-[#38BDF8]/40'
              }`}
            >
              <div>
                <p className="text-sm font-medium">{n.message}</p>
                <span className="text-xs text-slate-500">{n.kind} · {formatRelativeTime(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
