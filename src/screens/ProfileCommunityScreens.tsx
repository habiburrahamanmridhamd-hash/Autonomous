import React, { useState } from 'react';
import { BarChart3, Lock, ShieldAlert, Sparkles, Trash2, Users } from 'lucide-react';
import { UserAvatar } from '../components/NexoraBrand';
import { apiFetch, formatRelativeTime, uploadMediaFile } from '../lib/api';
import { CommunityGroup, ReelItem, ScreenId, SocialPost, UserProfile, WatchVideo } from '../types';

export function ProfileView({
  currentUser,
  posts,
  reels,
  onNavigate,
}: {
  currentUser: UserProfile | null;
  posts: SocialPost[];
  reels: ReelItem[];
  onNavigate: (s: ScreenId) => void;
}) {
  const [tab, setTab] = useState<'posts' | 'reels' | 'saved'>('posts');

  if (!currentUser) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center mb-24">
        <h2 className="font-display text-xl font-bold mb-2">NEXORA Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Sign in or register to customize your profile, cover banner, and creator portfolio.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => onNavigate('login')} className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-sm font-semibold">
            Sign In
          </button>
          <button onClick={() => onNavigate('register')} className="px-5 py-2.5 min-h-[44px] rounded-xl glass-panel text-sm font-medium">
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const myPosts = posts.filter((p) => p.authorId === currentUser.id);
  const myReels = reels.filter((r) => r.authorId === currentUser.id);
  const savedPosts = posts.filter((p) => p.saves.includes(currentUser.id));

  return (
    <div className="space-y-5 pb-24">
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-[#080B14] via-[#10182A] to-[#8B5CF6]/40 relative">
          {currentUser.coverUrl && (
            <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-5 pt-0">
          <div className="-mt-10 flex items-end justify-between gap-3 mb-3">
            <UserAvatar src={currentUser.avatarUrl} name={currentUser.displayName} size={76} />
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('edit-profile')}
                className="px-4 py-2 min-h-[40px] rounded-xl glass-panel text-xs font-semibold"
              >
                Edit Profile
              </button>
              <button
                onClick={() => onNavigate('creator-studio')}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
              >
                Creator Studio
              </button>
            </div>
          </div>
          <h2 className="font-display text-xl font-bold">{currentUser.displayName}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            @{currentUser.username} · {currentUser.isPrivate ? 'Private Account' : 'Public Profile'}
          </p>
          {currentUser.bio && <p className="text-sm mt-2.5">{currentUser.bio}</p>}
          <div className="flex items-center gap-5 mt-4 text-xs font-semibold tabular-nums">
            <span>{currentUser.followersCount} Followers</span>
            <span>{currentUser.followingCount} Following</span>
            <span>{myPosts.length} Posts</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 glass-panel rounded-xl w-fit">
        {(['posts', 'reels', 'saved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold capitalize ${
              tab === t ? 'bg-[#8B5CF6] text-white' : ''
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <div className="space-y-3">
          {myPosts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No posts published yet.</div>
          ) : (
            myPosts.map((p) => (
              <div key={p.id} className="glass-panel rounded-2xl p-4">
                <p className="text-sm">{p.content}</p>
                <div className="text-xs text-slate-500 mt-2 tabular-nums">
                  {p.likes.length} likes · {p.comments.length} comments · {formatRelativeTime(p.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'reels' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {myReels.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No Reels uploaded yet.</div>
          ) : (
            myReels.map((r) => (
              <div key={r.id} className="glass-panel rounded-2xl overflow-hidden">
                <video src={r.videoUrl} controls className="w-full h-56 object-cover bg-black" />
                <div className="p-3 text-xs">{r.caption}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-3">
          {savedPosts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No saved posts yet.</div>
          ) : (
            savedPosts.map((p) => (
              <div key={p.id} className="glass-panel rounded-2xl p-4">
                <div className="text-xs font-semibold text-[#38BDF8] mb-1">@{p.author?.username}</div>
                <p className="text-sm">{p.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function EditProfileView({
  currentUser,
  token,
  onSaved,
  onNavigate,
  onNotify,
}: {
  currentUser: UserProfile | null;
  token: string | null;
  onSaved: (u: UserProfile) => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);
  const [coverUrl, setCoverUrl] = useState<string | null>(currentUser?.coverUrl || null);
  const [saving, setSaving] = useState(false);

  if (!currentUser || !token) return null;

  async function uploadField(file: File, target: 'avatar' | 'cover') {
    const res = await uploadMediaFile(file, file.name, token!);
    if (target === 'avatar') setAvatarUrl(res.url);
    else setCoverUrl(res.url);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch<UserProfile>(
        '/api/users/me',
        {
          method: 'PATCH',
          body: JSON.stringify({ displayName, bio, avatarUrl, coverUrl }),
        },
        token
      );
      onSaved(updated);
      onNotify('Profile updated');
      onNavigate('profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Edit Profile</h2>
      <form onSubmit={save} className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <label className="cursor-pointer px-4 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold flex items-center">
            Upload Profile Picture
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadField(e.target.files[0], 'avatar')} />
          </label>
          <label className="cursor-pointer px-4 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold flex items-center">
            Upload Cover Image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadField(e.target.files[0], 'cover')} />
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-5 min-h-[48px] rounded-xl glass-panel text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function CommunitiesView({
  communities,
  currentUser,
  token,
  onRefresh,
  onNavigate,
  onNotify,
}: {
  communities: CommunityGroup[];
  currentUser: UserProfile | null;
  token: string | null;
  onRefresh: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [postText, setPostText] = useState<Record<string, string>>({});

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { onNavigate('login'); return; }
    await apiFetch('/api/communities', { method: 'POST', body: JSON.stringify({ name, description, privacy }) }, token);
    setName('');
    setDescription('');
    onNotify('Community created');
    onRefresh();
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Communities</h2>

      <form onSubmit={createGroup} className="glass-panel rounded-2xl p-5 space-y-3">
        <div className="text-sm font-semibold">Create Public or Private Group</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name..."
            className="min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          />
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
            className="min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          >
            <option value="public">Public Group</option>
            <option value="private">Private Group</option>
          </select>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Community focus and rules..."
          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />
        <button type="submit" className="px-5 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold">
          Create Group
        </button>
      </form>

      {communities.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No communities yet. Create the first group above.</div>
      ) : (
        communities.map((c) => {
          const isMember = Boolean(currentUser && c.members.includes(currentUser.id));
          const isMod = Boolean(currentUser && (c.ownerId === currentUser.id || c.moderators.includes(currentUser.id)));
          return (
            <div key={c.id} className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base">{c.name}</h3>
                    {c.privacy === 'private' && <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.privacy} · {c.members.length} members {isMod ? '· Moderator' : ''}
                  </p>
                  {c.description && <p className="text-sm mt-1.5">{c.description}</p>}
                </div>
                <button
                  onClick={async () => {
                    if (!token) { onNavigate('login'); return; }
                    await apiFetch(`/api/communities/${c.id}/join`, { method: 'POST' }, token);
                    onRefresh();
                  }}
                  className="px-4 min-h-[40px] rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold shrink-0"
                >
                  {isMember ? 'Joined' : 'Join'}
                </button>
              </div>

              {isMember && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={postText[c.id] || ''}
                    onChange={(e) => setPostText((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="Discuss with the group..."
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-xs"
                  />
                  <button
                    onClick={async () => {
                      const txt = (postText[c.id] || '').trim();
                      if (!txt || !token) return;
                      await apiFetch(`/api/communities/${c.id}/posts`, { method: 'POST', body: JSON.stringify({ text: txt }) }, token);
                      setPostText((p) => ({ ...p, [c.id]: '' }));
                      onRefresh();
                    }}
                    className="px-4 min-h-[40px] rounded-xl bg-[#38BDF8] text-[#080B14] text-xs font-semibold"
                  >
                    Post
                  </button>
                </div>
              )}

              {c.posts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  {c.posts.map((gp) => (
                    <div key={gp.id} className="flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-semibold">@{gp.author?.username || 'member'}: </span>
                        <span className="text-slate-600 dark:text-slate-300">{gp.text}</span>
                      </div>
                      {(isMod || gp.authorId === currentUser?.id) && token && (
                        <button
                          aria-label="Moderate post"
                          onClick={async () => {
                            await apiFetch(`/api/communities/${c.id}/posts/${gp.id}`, { method: 'DELETE' }, token);
                            onNotify('Post removed by moderation');
                            onRefresh();
                          }}
                          className="text-rose-500 p-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export function CreatorStudioView({
  currentUser,
  posts,
  reels,
  watchVideos,
}: {
  currentUser: UserProfile | null;
  posts: SocialPost[];
  reels: ReelItem[];
  watchVideos: WatchVideo[];
}) {
  const [strategy, setStrategy] = useState('');
  const [loading, setLoading] = useState(false);

  const myPosts = currentUser ? posts.filter((p) => p.authorId === currentUser.id) : [];
  const myReels = currentUser ? reels.filter((r) => r.authorId === currentUser.id) : [];
  const myWatch = currentUser ? watchVideos.filter((v) => v.channelId === currentUser.id) : [];
  const totalLikes =
    myPosts.reduce((acc, p) => acc + p.likes.length, 0) +
    myReels.reduce((acc, r) => acc + r.likes.length, 0);
  const totalViews = myWatch.reduce((acc, v) => acc + v.views, 0);

  async function askAiStrategy() {
    setLoading(true);
    try {
      const res = await apiFetch<{ result: string }>('/api/ai/assist', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'recommend',
          prompt: `Creator with ${myPosts.length} posts, ${myReels.length} reels, ${myWatch.length} watch videos, and ${totalLikes} likes.`,
        }),
      });
      setStrategy(res.result);
    } catch (err) {
      setStrategy(err instanceof Error ? err.message : 'AI strategy unavailable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Creator Studio</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Real database engagement & Gemini AI strategy</p>
        </div>
        <BarChart3 className="w-6 h-6 text-[#38BDF8]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Posts', myPosts.length],
          ['Reels', myReels.length],
          ['Likes', totalLikes],
          ['Watch Views', totalViews],
        ].map(([label, val]) => (
          <div key={String(label)} className="glass-panel rounded-2xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
            <div className="font-display text-2xl font-bold tabular-nums mt-1">{val}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
            <span>AI Content Recommendation</span>
          </div>
          <button
            onClick={askAiStrategy}
            disabled={loading}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
          >
            {loading ? 'Analyzing...' : 'Generate Ideas'}
          </button>
        </div>
        {strategy && <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{strategy}</p>}
      </div>
    </div>
  );
}
