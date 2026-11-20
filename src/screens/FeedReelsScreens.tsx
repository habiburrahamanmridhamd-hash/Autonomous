import React, { useState } from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Plus,
  Repeat2,
  Share2,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserAvatar } from '../components/NexoraBrand';
import { apiFetch, formatRelativeTime, shareContent } from '../lib/api';
import { ReelItem, ScreenId, SocialPost, UserProfile } from '../types';

export function HomeFeedView({
  posts,
  currentUser,
  token,
  lowBandwidth,
  onRefresh,
  onNavigate,
  onNotify,
}: {
  posts: SocialPost[];
  currentUser: UserProfile | null;
  token: string | null;
  lowBandwidth: boolean;
  onRefresh: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'personalized' | 'trending' | 'pulse'>('personalized');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [activeStory, setActiveStory] = useState<SocialPost | null>(null);

  const stories = posts.filter((p) => p.type === 'story');
  const feedItems =
    tab === 'pulse'
      ? posts.filter((p) => p.type === 'pulse')
      : tab === 'trending'
        ? [...posts]
            .filter((p) => p.type !== 'story')
            .sort((a, b) => b.likes.length + b.comments.length * 2 + b.reposts.length - (a.likes.length + a.comments.length * 2 + a.reposts.length))
        : posts.filter((p) => p.type !== 'story');

  async function requireSignedInAction(fn: () => Promise<void>) {
    if (!token || !currentUser) {
      onNotify('Sign in or create an account to interact.');
      onNavigate('login');
      return;
    }
    await fn();
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Stories strip */}
      <section className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold">Stories</h2>
          <button
            onClick={() => onNavigate('create-post')}
            className="text-xs font-medium text-[#38BDF8] hover:underline whitespace-nowrap"
          >
            Add Story
          </button>
        </div>
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => onNavigate('create-post')}
            className="flex flex-col items-center gap-1.5 shrink-0 min-w-[60px]"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#38BDF8] flex items-center justify-center text-[#38BDF8]">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs truncate max-w-[64px]">New</span>
          </button>
          {stories.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No active stories yet. Share a photo or text story.
            </p>
          ) : (
            stories.map((story) => (
              <button
                key={story.id}
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0 min-w-[60px]"
              >
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#38BDF8] to-[#8B5CF6]">
                  <UserAvatar src={story.author?.avatarUrl} name={story.author?.displayName || 'Creator'} size={52} />
                </div>
                <span className="text-xs truncate max-w-[64px]">{story.author?.username || 'story'}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Active Story Viewer Overlay */}
      {activeStory && (
        <div className="glass-panel rounded-3xl p-5 border-[#38BDF8]/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <UserAvatar src={activeStory.author?.avatarUrl} name={activeStory.author?.displayName || 'User'} size={36} />
              <div>
                <div className="text-sm font-semibold">{activeStory.author?.displayName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Story · {formatRelativeTime(activeStory.createdAt)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveStory(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-white/10"
            >
              Close
            </button>
          </div>
          {activeStory.mediaUrl && activeStory.mediaType === 'image' && (
            <img
              src={activeStory.mediaUrl}
              alt={activeStory.content}
              referrerPolicy="no-referrer"
              className="w-full max-h-80 object-cover rounded-2xl mb-3"
            />
          )}
          <p className="text-sm">{activeStory.content}</p>
        </div>
      )}

      {/* Feed Mode Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 glass-panel rounded-xl w-fit">
        {(['personalized', 'trending', 'pulse'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
              tab === m
                ? 'bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {m === 'pulse' ? 'Pulse Threads' : m}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {feedItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center">
          <h3 className="font-display text-lg font-semibold mb-2">
            {tab === 'pulse' ? 'No Pulse updates yet' : 'Your NEXORA feed is ready'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 max-w-md mx-auto">
            Publish real posts, photos, videos, or Pulse threads. All interactions and metrics are recorded directly in the database.
          </p>
          <button
            onClick={() => onNavigate('create-post')}
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-sm font-semibold"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((post) => {
            const liked = Boolean(currentUser && post.likes.includes(currentUser.id));
            const saved = Boolean(currentUser && post.saves.includes(currentUser.id));
            const isFollowing = Boolean(currentUser && post.author && currentUser.following.includes(post.author.id));
            const isSelf = currentUser?.id === post.authorId;

            return (
              <article key={post.id} className="glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar src={post.author?.avatarUrl} name={post.author?.displayName || 'Creator'} size={42} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{post.author?.displayName || 'Member'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{post.author?.username || 'user'} · {post.type === 'pulse' ? 'Pulse' : 'Feed'} · {formatRelativeTime(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  {!isSelf && post.author && (
                    <button
                      onClick={() =>
                        requireSignedInAction(async () => {
                          await apiFetch(`/api/users/${post.author!.id}/follow`, { method: 'POST' }, token);
                          onRefresh();
                        })
                      }
                      className="px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 dark:border-white/15 text-xs font-medium flex items-center gap-1.5 shrink-0"
                    >
                      {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-[#38BDF8]" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isFollowing ? 'Following' : 'Follow'}</span>
                    </button>
                  )}
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

                {post.mediaUrl && post.mediaType === 'image' && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                    <img
                      src={post.mediaUrl}
                      alt="Post attachment"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full max-h-[420px] object-cover"
                    />
                  </div>
                )}

                {post.mediaUrl && post.mediaType === 'video' && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black">
                    <video
                      src={post.mediaUrl}
                      controls
                      preload={lowBandwidth ? 'none' : 'metadata'}
                      className="w-full max-h-[420px]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        requireSignedInAction(async () => {
                          await apiFetch(`/api/posts/${post.id}/like`, { method: 'POST' }, token);
                          onRefresh();
                        })
                      }
                      className={`min-h-[44px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium tabular-nums ${
                        liked ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
                      <span>{post.likes.length}</span>
                    </button>

                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="min-h-[44px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </button>

                    <button
                      onClick={() =>
                        requireSignedInAction(async () => {
                          await apiFetch(`/api/posts/${post.id}/repost`, { method: 'POST' }, token);
                          onNotify('Reposted to Pulse');
                          onRefresh();
                        })
                      }
                      className="min-h-[44px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums"
                    >
                      <Repeat2 className="w-4 h-4" />
                      <span>{post.reposts.length}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        const mode = await shareContent(post.author?.displayName || 'NEXORA Post', post.content);
                        onNotify(mode === 'shared' ? 'Shared via system sheet' : 'Copied post text');
                      }}
                      aria-label="Share post"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        requireSignedInAction(async () => {
                          await apiFetch(`/api/posts/${post.id}/save`, { method: 'POST' }, token);
                          onRefresh();
                        })
                      }
                      aria-label="Save post"
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg ${
                        saved ? 'text-[#38BDF8]' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#38BDF8]' : ''}`} />
                    </button>
                  </div>
                </div>

                {openComments[post.id] && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 space-y-2.5">
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-xs flex items-start gap-2">
                        <span className="font-semibold shrink-0">{c.author?.username || 'user'}:</span>
                        <span className="text-slate-600 dark:text-slate-300">{c.text}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="flex-1 min-h-[40px] px-3 rounded-lg bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-xs"
                      />
                      <button
                        onClick={() =>
                          requireSignedInAction(async () => {
                            const txt = (commentInputs[post.id] || '').trim();
                            if (!txt) return;
                            await apiFetch(`/api/posts/${post.id}/comment`, { method: 'POST', body: JSON.stringify({ text: txt }) }, token);
                            setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
                            onRefresh();
                          })
                        }
                        className="px-4 min-h-[40px] rounded-lg bg-[#8B5CF6] text-white text-xs font-semibold"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReelsView({
  reels,
  currentUser,
  token,
  lowBandwidth,
  onRefresh,
  onNavigate,
  onNotify,
}: {
  reels: ReelItem[];
  currentUser: UserProfile | null;
  token: string | null;
  lowBandwidth: boolean;
  onRefresh: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [activeCommentReelId, setActiveCommentReelId] = useState<string | null>(null);

  if (reels.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center mb-24">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#38BDF8] to-[#8B5CF6] flex items-center justify-center text-white">
          <Play className="w-7 h-7" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">NEXORA Reels</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Upload a vertical MP4 or WebM video to launch the full-screen swipeable Reels stream.
        </p>
        <button
          onClick={() => onNavigate('upload-video')}
          className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-sm font-semibold"
        >
          Upload Reel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Reels</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="min-h-[40px] px-3 rounded-lg glass-panel text-xs font-medium flex items-center gap-1.5"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{muted ? 'Muted' : 'Sound On'}</span>
          </button>
          <button
            onClick={() => onNavigate('upload-video')}
            className="min-h-[40px] px-3.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-semibold"
          >
            Upload Reel
          </button>
        </div>
      </div>

      <div className="h-[72vh] overflow-y-auto snap-y snap-mandatory space-y-4 no-scrollbar rounded-3xl">
        {reels.map((reel) => {
          const liked = Boolean(currentUser && reel.likes.includes(currentUser.id));
          const saved = Boolean(currentUser && reel.saves.includes(currentUser.id));
          return (
            <div
              key={reel.id}
              className="relative h-[72vh] snap-start rounded-3xl overflow-hidden bg-[#080B14] border border-white/10"
            >
              <video
                src={reel.videoUrl}
                autoPlay={!lowBandwidth}
                loop
                muted={muted}
                playsInline
                controls
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent text-white pointer-events-none">
                <div className="font-semibold text-sm">@{reel.author?.username || 'creator'}</div>
                <p className="text-xs text-white/90 mt-1 max-w-md">{reel.caption}</p>
              </div>
              <div className="absolute right-3 bottom-20 flex flex-col items-center gap-3 text-white">
                <button
                  onClick={async () => {
                    if (!token) { onNavigate('login'); return; }
                    await apiFetch(`/api/reels/${reel.id}/like`, { method: 'POST' }, token);
                    onRefresh();
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md flex flex-col items-center justify-center p-2"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="text-[11px] tabular-nums">{reel.likes.length}</span>
                </button>
                <button
                  onClick={() => setActiveCommentReelId(activeCommentReelId === reel.id ? null : reel.id)}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md flex flex-col items-center justify-center p-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-[11px] tabular-nums">{reel.comments.length}</span>
                </button>
                <button
                  onClick={async () => {
                    if (!token) { onNavigate('login'); return; }
                    await apiFetch(`/api/reels/${reel.id}/save`, { method: 'POST' }, token);
                    onRefresh();
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center"
                >
                  <Bookmark className={`w-5 h-5 ${saved ? 'fill-[#38BDF8] text-[#38BDF8]' : ''}`} />
                </button>
                <button
                  onClick={async () => {
                    const m = await shareContent('NEXORA Reel', reel.caption);
                    onNotify(m === 'shared' ? 'Shared Reel' : 'Reel link copied');
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeCommentReelId && (
        <div className="glass-panel rounded-2xl p-4 flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Comment on this Reel..."
            className="flex-1 min-h-[44px] px-3 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          />
          <button
            onClick={async () => {
              if (!token || !commentText.trim()) return;
              await apiFetch(`/api/reels/${activeCommentReelId}/comment`, {
                method: 'POST',
                body: JSON.stringify({ text: commentText.trim() }),
              }, token);
              setCommentText('');
              onRefresh();
            }}
            className="px-4 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
