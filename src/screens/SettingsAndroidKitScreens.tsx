import React, { useEffect, useState } from 'react';
import { Download, FolderCode, LogOut, Moon, ShieldCheck, Smartphone, Sun, Wifi } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ScreenId, UserProfile } from '../types';

export function SettingsView({
  darkMode,
  onToggleDarkMode,
  lowBandwidth,
  onToggleLowBandwidth,
  currentUser,
  onLogout,
  onNavigate,
}: {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lowBandwidth: boolean;
  onToggleLowBandwidth: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onNavigate: (s: ScreenId) => void;
}) {
  return (
    <div className="space-y-4 pb-24">
      <h2 className="font-display text-2xl font-bold">Settings</h2>

      <div className="glass-panel rounded-2xl divide-y divide-slate-200 dark:divide-white/10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-[#8B5CF6]" /> : <Sun className="w-5 h-5 text-[#38BDF8]" />}
            <div>
              <div className="text-sm font-semibold">Appearance Theme</div>
              <div className="text-xs text-slate-500">{darkMode ? 'Premium Dark Mode' : 'Premium Light Mode'}</div>
            </div>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold"
          >
            Switch to {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-[#38BDF8]" />
            <div>
              <div className="text-sm font-semibold">Low Bandwidth & Battery Saver</div>
              <div className="text-xs text-slate-500">Disable video preload & autoplay on cellular</div>
            </div>
          </div>
          <button
            onClick={onToggleLowBandwidth}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold ${
              lowBandwidth ? 'bg-[#38BDF8] text-[#080B14]' : 'glass-panel'
            }`}
          >
            {lowBandwidth ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <button
          onClick={() => onNavigate('privacy-center')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#8B5CF6]" />
            <div>
              <div className="text-sm font-semibold">Privacy Center & Password Recovery</div>
              <div className="text-xs text-slate-500">Account privacy, recovery, and deletion</div>
            </div>
          </div>
          <span className="text-xs text-[#38BDF8]">Open</span>
        </button>

        <button
          onClick={() => onNavigate('android-kit')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-[#38BDF8]" />
            <div>
              <div className="text-sm font-semibold">Android Studio & APK Build Kit</div>
              <div className="text-xs text-slate-500">Inspect Flutter source, Gradle, FastAPI & download ZIP</div>
            </div>
          </div>
          <span className="text-xs text-[#38BDF8]">Inspect</span>
        </button>

        {currentUser && (
          <button
            onClick={onLogout}
            className="w-full p-4 flex items-center gap-3 text-rose-500 font-semibold text-sm hover:bg-rose-500/5"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out (@{currentUser.username})</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function PrivacyCenterView({
  currentUser,
  token,
  onUpdated,
  onDeleted,
  onNotify,
}: {
  currentUser: UserProfile | null;
  token: string | null;
  onUpdated: (u: UserProfile) => void;
  onDeleted: () => void;
  onNotify: (msg: string) => void;
}) {
  const [recEmail, setRecEmail] = useState(currentUser?.email || '');
  const [recPhrase, setRecPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function togglePrivacy() {
    if (!currentUser || !token) return;
    const updated = await apiFetch<UserProfile>(
      '/api/users/me',
      { method: 'PATCH', body: JSON.stringify({ isPrivate: !currentUser.isPrivate }) },
      token
    );
    onUpdated(updated);
    onNotify(`Account is now ${updated.isPrivate ? 'Private' : 'Public'}`);
  }

  async function recoverPassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ email: recEmail, recoveryPhrase: recPhrase, newPassword }),
      });
      setRecPhrase('');
      setNewPassword('');
      onNotify('Password updated. You can now sign in with your new password.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Recovery failed');
    }
  }

  async function deleteAccount() {
    if (!token) return;
    await apiFetch('/api/users/me', { method: 'DELETE' }, token);
    onDeleted();
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Privacy Center</h2>

      {currentUser && (
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm">Private Account</div>
            <div className="text-xs text-slate-500">Restrict profile visibility to approved followers</div>
          </div>
          <button
            onClick={togglePrivacy}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold ${
              currentUser.isPrivate ? 'bg-[#8B5CF6] text-white' : 'glass-panel'
            }`}
          >
            {currentUser.isPrivate ? 'Private' : 'Public'}
          </button>
        </div>
      )}

      <form onSubmit={recoverPassword} className="glass-panel rounded-2xl p-5 space-y-3">
        <div className="font-semibold text-sm">Password Recovery</div>
        <input
          type="email"
          required
          value={recEmail}
          onChange={(e) => setRecEmail(e.target.value)}
          placeholder="Account email"
          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />
        <input
          type="text"
          required
          value={recPhrase}
          onChange={(e) => setRecPhrase(e.target.value)}
          placeholder="Recovery phrase set during registration"
          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 6 chars)"
          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />
        <button type="submit" className="px-5 min-h-[44px] rounded-xl bg-[#38BDF8] text-[#080B14] text-xs font-semibold">
          Reset Password
        </button>
      </form>

      {currentUser && (
        <div className="glass-panel rounded-2xl p-5 space-y-3 border-rose-500/30">
          <div className="font-semibold text-sm text-rose-500">Danger Zone: Account Deletion</div>
          <p className="text-xs text-slate-500">Permanently removes your NEXORA profile, posts, reels, and messages from the server.</p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 min-h-[40px] rounded-xl border border-rose-500/40 text-rose-500 text-xs font-semibold"
            >
              Delete My Account
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Confirm Permanent Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 min-h-[40px] rounded-xl glass-panel text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AndroidKitView() {
  const [files, setFiles] = useState<{ path: string; size: number }[]>([]);
  const [envInfo, setEnvInfo] = useState<{
    flutterInstalled: boolean;
    androidSdkInstalled: boolean;
    apkCompiledInCloudSandbox: boolean;
    targetApplicationId: string;
    expectedApkPath: string;
  } | null>(null);
  const [selectedPath, setSelectedPath] = useState('BUILD_APK.md');
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    apiFetch<{ environment: typeof envInfo; files: { path: string; size: number }[] }>('/api/project/files')
      .then((res) => {
        setEnvInfo(res.environment);
        setFiles(res.files);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPath) return;
    apiFetch<{ content: string }>(`/api/project/file?path=${encodeURIComponent(selectedPath)}`)
      .then((res) => setFileContent(res.content))
      .catch(() => setFileContent(''));
  }, [selectedPath]);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Android Studio & APK Kit</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Application ID: {envInfo?.targetApplicationId || 'com.nexora.social'} · Complete Flutter + Gradle + FastAPI + PostgreSQL source
          </p>
        </div>
        <a
          href="/api/project/export.zip"
          download="nexora-android-studio-kit.zip"
          className="px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white text-xs font-semibold flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Complete Project ZIP</span>
        </a>
      </div>

      <div className="glass-panel rounded-2xl p-4 text-xs space-y-1.5">
        <div className="font-semibold text-sm">Environment Build Verification</div>
        <p className="text-slate-600 dark:text-slate-300">
          Cloud web container lacks Flutter SDK and Android SDK, so <code className="font-mono">app-release.apk</code> is compiled locally in Android Studio or with <code className="font-mono">flutter build apk --release</code>.
        </p>
        <p className="font-mono text-[#38BDF8]">Expected output: {envInfo?.expectedApkPath || 'nexora_android/build/app/outputs/flutter-apk/app-release.apk'}</p>
      </div>

      <div className="grid md:grid-cols-12 gap-4">
        <div className="md:col-span-5 glass-panel rounded-2xl p-3 max-h-[55vh] overflow-y-auto space-y-1">
          <div className="text-xs font-semibold px-2 py-1 text-slate-500">Project Files ({files.length})</div>
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelectedPath(f.path)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between gap-2 ${
                selectedPath === f.path ? 'bg-[#8B5CF6] text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <span className="truncate flex items-center gap-1.5">
                <FolderCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{f.path}</span>
              </span>
              <span className="text-[10px] opacity-75 shrink-0 tabular-nums">{f.size}B</span>
            </button>
          ))}
        </div>
        <div className="md:col-span-7 glass-panel rounded-2xl p-4 max-h-[55vh] overflow-auto">
          <div className="text-xs font-mono text-[#38BDF8] mb-2">{selectedPath}</div>
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">
            {fileContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
