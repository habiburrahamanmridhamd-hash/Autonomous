import React, { useEffect, useState } from 'react';
import { ListVideo, PlayCircle, Search, Sparkles, Tv } from 'lucide-react';
import { apiFetch, formatRelativeTime } from '../lib/api';
import { CommunityGroup, Playlist, ScreenId, SocialPost, UserProfile, WatchHistoryItem, WatchVideo } from '../types';

export function WatchView({
  videos,
  playlists,
  history,
  currentUser,
  token,
  onRefresh,
  onNavigate,
  onNotify,
}: {
  videos: WatchVideo[];
  playlists: Playlist[];
  history: WatchHistoryItem[];
  currentUser: UserProfile | null;
  token: string | null;
  onRefresh: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'channels' | 'playlists' | 'history'>('channels');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<WatchVideo | null>(videos[0] || null);

  useEffect(() => {
    if (!selectedVideo && videos.length > 0) setSelectedVideo(videos[0]);
  }, [videos, selectedVideo]);

  async function playVideo(v: WatchVideo) {
    setSelectedVideo(v);
    await apiFetch(`/api/watch/${v.id}/view`, { method: 'POST' }, token).catch(() => {});
    onRefresh();
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">NEXORA Watch</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Long-form videos, creator channels, playlists, and history</p>
        </div>
        <button
          onClick={() => onNavigate('upload-video')}
          className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
        >
          Upload Long Video
        </button>
      </div>

      {selectedVideo && (
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="bg-black aspect-video">
            <video src={selectedVideo.videoUrl} controls className="w-full h-full" />
          </div>
          <div className="p-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold">{selectedVideo.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                {selectedVideo.channel?.displayName || 'Channel'} · {selectedVideo.views} views · {selectedVideo.duration}
              </p>
              {selectedVideo.description && <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">{selectedVideo.description}</p>}
            </div>
            {currentUser && selectedVideo.channel && currentUser.id !== selectedVideo.channel.id && (
              <button
                onClick={async () => {
                  await apiFetch(`/api/watch/subscribe/${selectedVideo.channel!.id}`, { method: 'POST' }, token);
                  onNotify('Subscription updated');
                  onRefresh();
                }}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
              >
                {currentUser.subscriptions.includes(selectedVideo.channel.id) ? 'Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 p-1 glass-panel rounded-xl w-fit">
        {(['channels', 'playlists', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold capitalize ${
              tab === t ? 'bg-[#8B5CF6] text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'channels' && (
        videos.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center text-sm text-slate-500">
            No Watch videos uploaded yet. Click Upload Long Video to publish the first channel episode.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {videos.map((v) => (
              <div key={v.id} className="glass-panel rounded-2xl p-4 flex flex-col justify-between gap-3">
                <button onClick={() => playVideo(v)} className="text-left group">
                  <div className="aspect-video rounded-xl bg-[#080B14] flex items-center justify-center mb-3 overflow-hidden relative">
                    <video src={v.videoUrl} preload="metadata" className="w-full h-full object-cover opacity-80" />
                    <PlayCircle className="w-10 h-10 text-white absolute" />
                  </div>
                  <div className="font-semibold text-sm group-hover:text-[#38BDF8] transition-colors">{v.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    {v.channel?.displayName || 'Creator'} · {v.views} views · {formatRelativeTime(v.createdAt)}
                  </div>
                </button>
                {playlists.length > 0 && token && (
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await apiFetch(`/api/playlists/${e.target.value}/add`, {
                        method: 'POST',
                        body: JSON.stringify({ videoId: v.id }),
                      }, token);
                      onNotify('Added to playlist');
                      onRefresh();
                    }}
                    className="w-full min-h-[38px] px-2.5 rounded-lg bg-white/70 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/10 text-xs"
                  >
                    <option value="">Add to playlist...</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.title}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'playlists' && (
        <div className="space-y-4">
          {token && (
            <div className="glass-panel rounded-2xl p-4 flex gap-2">
              <input
                type="text"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="New playlist name..."
                className="flex-1 min-h-[44px] px-3 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
              />
              <button
                onClick={async () => {
                  if (!newPlaylistTitle.trim()) return;
                  await apiFetch('/api/playlists', { method: 'POST', body: JSON.stringify({ title: newPlaylistTitle.trim() }) }, token);
                  setNewPlaylistTitle('');
                  onRefresh();
                }}
                className="px-4 min-h-[44px] rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          )}
          {playlists.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No playlists created yet.</div>
          ) : (
            playlists.map((pl) => (
              <div key={pl.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListVideo className="w-5 h-5 text-[#38BDF8]" />
                  <div>
                    <div className="font-semibold text-sm">{pl.title}</div>
                    <div className="text-xs text-slate-500 tabular-nums">{pl.videoIds.length} videos</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-500">No watch history recorded yet.</div>
          ) : (
            history.map((h) => (
              <div key={h.videoId} className="glass-panel rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tv className="w-5 h-5 text-[#8B5CF6]" />
                  <div>
                    <div className="font-semibold text-sm">{h.video?.title || 'Video'}</div>
                    <div className="text-xs text-slate-500">Watched {formatRelativeTime(h.watchedAt)} ago</div>
                  </div>
                </div>
                {h.video && (
                  <button onClick={() => playVideo(h.video!)} className="text-xs font-semibold text-[#38BDF8]">
                    Resume
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ExploreView({
  posts,
  communities,
  onNavigate,
}: {
  posts: SocialPost[];
  communities: CommunityGroup[];
  onNavigate: (s: ScreenId) => void;
}) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  async function loadDiscovery() {
    setLoadingAi(true);
    setAiError('');
    try {
      const res = await apiFetch<{ topics: string[] }>('/api/ai/discover');
      setTopics(res.topics);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Discovery unavailable');
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Explore</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI-assisted content discovery & communities</p>
        </div>
        <button
          onClick={loadDiscovery}
          disabled={loadingAi}
          className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loadingAi ? 'Discovering...' : 'AI Discover'}</span>
        </button>
      </div>

      {aiError && <div className="glass-panel rounded-2xl p-4 text-xs text-rose-500">{aiError}</div>}

      {topics.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold mb-3">Recommended Creative Themes</h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {topics.map((t, i) => (
              <button
                key={i}
                onClick={() => onNavigate('search')}
                className="text-left p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium hover:border-[#38BDF8]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold mb-2">Active Posts</h3>
          <p className="text-2xl font-display font-bold tabular-nums">{posts.length}</p>
          <button onClick={() => onNavigate('home')} className="text-xs text-[#38BDF8] mt-3 font-medium">
            Browse Home Feed
          </button>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold mb-2">Communities</h3>
          <p className="text-2xl font-display font-bold tabular-nums">{communities.length}</p>
          <button onClick={() => onNavigate('communities')} className="text-xs text-[#38BDF8] mt-3 font-medium">
            Explore Groups
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchView() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    users: UserProfile[];
    posts: SocialPost[];
    communities: CommunityGroup[];
    aiInsight: string;
  } | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch<typeof result>(`/api/ai/search?q=${encodeURIComponent(query.trim())}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Smart Search</h2>
      <form onSubmit={runSearch} className="glass-panel rounded-2xl p-3 flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators, posts, communities, or topics..."
            className="w-full min-h-[40px] bg-transparent text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          {result.aiInsight && (
            <div className="glass-panel rounded-2xl p-4">
              <div className="text-xs font-semibold text-[#38BDF8] mb-1">Gemini AI Context</div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{result.aiInsight}</p>
            </div>
          )}
          <div className="glass-panel rounded-2xl p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500">Matched Users ({result.users.length})</div>
            {result.users.map((u) => (
              <div key={u.id} className="text-sm font-medium">{u.displayName} · @{u.username}</div>
            ))}
            <div className="text-xs font-semibold text-slate-500 pt-2">Matched Posts ({result.posts.length})</div>
            {result.posts.map((p) => (
              <div key={p.id} className="text-sm text-slate-600 dark:text-slate-300">{p.content}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
