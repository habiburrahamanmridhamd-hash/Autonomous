import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Compass,
  Film,
  Home,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Tv,
  User,
  Users,
} from 'lucide-react';
import { NexoraLogo, UserAvatar } from './components/NexoraBrand';
import { apiFetch } from './lib/api';
import { LoginView, OnboardingView, RegisterView, SplashView } from './screens/AuthScreens';
import { CreatePostView, UploadVideoView } from './screens/CreateScreens';
import { HomeFeedView, ReelsView } from './screens/FeedReelsScreens';
import { ChatDetailsView, MessagesView, NotificationsView } from './screens/MessagesNotificationsScreens';
import { CommunitiesView, CreatorStudioView, EditProfileView, ProfileView } from './screens/ProfileCommunityScreens';
import { AndroidKitView, PrivacyCenterView, SettingsView } from './screens/SettingsAndroidKitScreens';
import { ExploreView, SearchView, WatchView } from './screens/WatchExploreScreens';
import {
  CommunityGroup,
  Conversation,
  NotificationItem,
  Playlist,
  ReelItem,
  ScreenId,
  SocialPost,
  UserProfile,
  WatchHistoryItem,
  WatchVideo,
} from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexora_token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<ScreenId>(() =>
    localStorage.getItem('nexora_token') ? 'home' : 'onboarding'
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Live persisted backend state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [watchVideos, setWatchVideos] = useState<WatchVideo[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [communities, setCommunities] = useState<CommunityGroup[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Right-rail quick Gemini AI composer
  const [quickAiPrompt, setQuickAiPrompt] = useState('');
  const [quickAiOutput, setQuickAiOutput] = useState('');
  const [quickAiBusy, setQuickAiBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshAll = useCallback(async () => {
    try {
      const [uList, pList, rList, wData, cList] = await Promise.all([
        apiFetch<UserProfile[]>('/api/users'),
        apiFetch<SocialPost[]>('/api/posts'),
        apiFetch<ReelItem[]>('/api/reels'),
        apiFetch<{ videos: WatchVideo[]; playlists: Playlist[]; history: WatchHistoryItem[] }>(
          '/api/watch',
          {},
          token
        ),
        apiFetch<CommunityGroup[]>('/api/communities'),
      ]);
      setUsers(uList);
      setPosts(pList);
      setReels(rList);
      setWatchVideos(wData.videos);
      setPlaylists(wData.playlists);
      setWatchHistory(wData.history);
      setCommunities(cList);

      if (token) {
        const [me, convs, notes] = await Promise.all([
          apiFetch<UserProfile>('/api/users/me', {}, token),
          apiFetch<Conversation[]>('/api/conversations', {}, token),
          apiFetch<NotificationItem[]>('/api/notifications', {}, token),
        ]);
        setCurrentUser(me);
        setConversations(convs);
        setNotifications(notes);
      } else {
        setCurrentUser(null);
        setConversations([]);
        setNotifications([]);
      }
    } catch {
      if (token) {
        localStorage.removeItem('nexora_token');
        setToken(null);
        setCurrentUser(null);
      }
    }
  }, [token]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Real-time WebSocket stream
  useEffect(() => {
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    ws.onmessage = () => {
      refreshAll();
    };
    return () => ws.close();
  }, [token, refreshAll]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleAuthSuccess(newToken: string, user: UserProfile) {
    localStorage.setItem('nexora_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
    setScreen('home');
    notify(`Welcome, ${user.displayName}`);
  }

  function handleLogout() {
    localStorage.removeItem('nexora_token');
    setToken(null);
    setCurrentUser(null);
    setScreen('login');
    notify('Signed out');
  }

  async function runQuickAi(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAiPrompt.trim()) return;
    setQuickAiBusy(true);
    try {
      const res = await apiFetch<{ result: string }>('/api/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ mode: 'caption', prompt: quickAiPrompt.trim() }),
      });
      setQuickAiOutput(res.result);
    } catch (err) {
      setQuickAiOutput(err instanceof Error ? err.message : 'AI unavailable');
    } finally {
      setQuickAiBusy(false);
    }
  }

  const bottomNavItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'HOME', icon: Home },
    { id: 'reels', label: 'REELS', icon: Film },
    { id: 'create-post', label: 'CREATE', icon: Plus },
    { id: 'messages', label: 'MESSAGES', icon: MessageSquare },
    { id: 'profile', label: 'PROFILE', icon: User },
  ];

  const desktopRailItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home Feed', icon: Home },
    { id: 'reels', label: 'Reels', icon: Film },
    { id: 'watch', label: 'Watch', icon: Tv },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'search', label: 'Smart Search', icon: Search },
    { id: 'creator-studio', label: 'Creator Studio', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy-center', label: 'Privacy Center', icon: ShieldCheck },
    { id: 'android-kit', label: 'Android APK Kit', icon: Smartphone },
  ];

  const hideBottomBar = screen === 'splash' || screen === 'onboarding' || screen === 'login' || screen === 'register';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080B14] text-[#080B14] dark:text-[#F8FAFC] relative overflow-x-hidden">
      {/* Ambient radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.16),transparent_48%)]"
      />

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-[54px] glass-nav border-b border-slate-200/80 dark:border-white/10">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            onClick={() => setScreen('home')}
            className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight whitespace-nowrap shrink-0"
          >
            <NexoraLogo size={30} />
            <span>NEXORA</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button onClick={() => setScreen('home')} className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0">
              Feed
            </button>
            <button onClick={() => setScreen('watch')} className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0">
              Watch
            </button>
            <button onClick={() => setScreen('communities')} className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0">
              Communities
            </button>
            <button onClick={() => setScreen('explore')} className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0">
              Explore
            </button>
            <button onClick={() => setScreen('android-kit')} className="hover:text-[#38BDF8] transition-colors whitespace-nowrap shrink-0">
              Android Kit
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setScreen('search')}
              aria-label="Search"
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle theme"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#38BDF8]" /> : <Moon className="w-4 h-4 text-[#8B5CF6]" />}
            </button>
            {currentUser ? (
              <button
                onClick={() => setScreen('profile')}
                className="px-3 py-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                @{currentUser.username}
              </button>
            ) : (
              <button
                onClick={() => setScreen('login')}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main 3-Column Responsive Workspace */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Rail (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-[72px] glass-panel rounded-3xl p-3 space-y-1">
            {desktopRailItems.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`w-full min-h-[42px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-[#38BDF8]/20 to-[#8B5CF6]/25 text-[#38BDF8] font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="text-xs font-mono tabular-nums text-[#38BDF8]">{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Active Screen Canvas */}
        <main className="lg:col-span-6 min-w-0">
          {screen === 'splash' && <SplashView onNavigate={setScreen} />}
          {screen === 'onboarding' && <OnboardingView onNavigate={setScreen} />}
          {screen === 'login' && <LoginView onAuthSuccess={handleAuthSuccess} onNavigate={setScreen} />}
          {screen === 'register' && <RegisterView onAuthSuccess={handleAuthSuccess} onNavigate={setScreen} />}
          {screen === 'home' && (
            <HomeFeedView
              posts={posts}
              currentUser={currentUser}
              token={token}
              lowBandwidth={lowBandwidth}
              onRefresh={refreshAll}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'reels' && (
            <ReelsView
              reels={reels}
              currentUser={currentUser}
              token={token}
              lowBandwidth={lowBandwidth}
              onRefresh={refreshAll}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'watch' && (
            <WatchView
              videos={watchVideos}
              playlists={playlists}
              history={watchHistory}
              currentUser={currentUser}
              token={token}
              onRefresh={refreshAll}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'explore' && (
            <ExploreView posts={posts} communities={communities} onNavigate={setScreen} />
          )}
          {screen === 'search' && <SearchView />}
          {screen === 'create-post' && (
            <CreatePostView token={token} onCreated={refreshAll} onNavigate={setScreen} onNotify={notify} />
          )}
          {screen === 'upload-video' && (
            <UploadVideoView token={token} onUploaded={refreshAll} onNavigate={setScreen} onNotify={notify} />
          )}
          {screen === 'messages' && (
            <MessagesView
              conversations={conversations}
              users={users}
              currentUser={currentUser}
              token={token}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setScreen('chat-details');
              }}
              onRefresh={refreshAll}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'chat-details' && (
            <ChatDetailsView
              conversation={activeConversation}
              currentUser={currentUser}
              token={token}
              onBack={() => setScreen('messages')}
              onRefresh={refreshAll}
              onNotify={notify}
            />
          )}
          {screen === 'notifications' && (
            <NotificationsView notifications={notifications} token={token} onRefresh={refreshAll} />
          )}
          {screen === 'profile' && (
            <ProfileView currentUser={currentUser} posts={posts} reels={reels} onNavigate={setScreen} />
          )}
          {screen === 'edit-profile' && (
            <EditProfileView
              currentUser={currentUser}
              token={token}
              onSaved={(u) => {
                setCurrentUser(u);
                refreshAll();
              }}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'communities' && (
            <CommunitiesView
              communities={communities}
              currentUser={currentUser}
              token={token}
              onRefresh={refreshAll}
              onNavigate={setScreen}
              onNotify={notify}
            />
          )}
          {screen === 'creator-studio' && (
            <CreatorStudioView currentUser={currentUser} posts={posts} reels={reels} watchVideos={watchVideos} />
          )}
          {screen === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              lowBandwidth={lowBandwidth}
              onToggleLowBandwidth={() => setLowBandwidth(!lowBandwidth)}
              currentUser={currentUser}
              onLogout={handleLogout}
              onNavigate={setScreen}
            />
          )}
          {screen === 'privacy-center' && (
            <PrivacyCenterView
              currentUser={currentUser}
              token={token}
              onUpdated={(u) => {
                setCurrentUser(u);
                refreshAll();
              }}
              onDeleted={handleLogout}
              onNotify={notify}
            />
          )}
          {screen === 'android-kit' && <AndroidKitView />}
        </main>

        {/* Right Context Rail (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="sticky top-[72px] space-y-4">
            {/* Quick Gemini AI Assistant */}
            <div className="glass-panel rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 font-display font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                <span>AI Studio Assistant</span>
              </div>
              <form onSubmit={runQuickAi} className="space-y-2.5">
                <input
                  type="text"
                  value={quickAiPrompt}
                  onChange={(e) => setQuickAiPrompt(e.target.value)}
                  placeholder="Idea for a caption or post..."
                  className="w-full min-h-[40px] px-3 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-xs"
                />
                <button
                  type="submit"
                  disabled={quickAiBusy}
                  className="w-full min-h-[38px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
                >
                  {quickAiBusy ? 'Generating...' : 'Generate Caption'}
                </button>
              </form>
              {quickAiOutput && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">{quickAiOutput}</p>
              )}
            </div>

            {/* Active People */}
            <div className="glass-panel rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-sm">People on NEXORA</span>
                <button onClick={() => setScreen('search')} className="text-xs text-[#38BDF8]">
                  Search
                </button>
              </div>
              {users.length === 0 ? (
                <p className="text-xs text-slate-500">Create an account to appear in the live directory.</p>
              ) : (
                <div className="space-y-2.5">
                  {users.slice(0, 4).map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar src={u.avatarUrl} name={u.displayName} size={34} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{u.displayName}</div>
                          <div className="text-[11px] text-slate-500 truncate">@{u.username}</div>
                        </div>
                      </div>
                      {currentUser && currentUser.id !== u.id && (
                        <button
                          onClick={async () => {
                            await apiFetch(`/api/users/${u.id}/follow`, { method: 'POST' }, token);
                            refreshAll();
                          }}
                          className="text-xs font-semibold text-[#38BDF8] shrink-0"
                        >
                          {currentUser.following.includes(u.id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Android APK Project Shortcut */}
            <div className="glass-panel rounded-3xl p-5 space-y-2">
              <div className="font-display font-semibold text-sm">Android APK Project</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Package ID <code className="font-mono">com.nexora.social</code> · Flutter + FastAPI + PostgreSQL source ready for Android Studio.
              </p>
              <button
                onClick={() => setScreen('android-kit')}
                className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:border-[#38BDF8]"
              >
                Open Android Build Kit
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Toast feedback */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 glass-panel px-4 py-2.5 rounded-xl text-xs font-semibold border-[#38BDF8]/50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Floating Glass Bottom Navigation Bar: HOME | REELS | CREATE | MESSAGES | PROFILE */}
      {!hideBottomBar && (
        <nav
          aria-label="Primary bottom navigation"
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[440px] h-[62px] glass-nav rounded-2xl shadow-xl shadow-[#8B5CF6]/15 px-2 grid grid-cols-5 items-center"
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            const isCreate = item.id === 'create-post';
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-transform active:scale-95"
              >
                {isCreate ? (
                  <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#38BDF8] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-[#8B5CF6]/30">
                    <Icon className="w-5 h-5" />
                  </span>
                ) : (
                  <>
                    <Icon className={`w-5 h-5 ${active ? 'text-[#38BDF8]' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span
                      className={`text-[10px] font-semibold tracking-tight whitespace-nowrap ${
                        active ? 'text-[#38BDF8]' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
