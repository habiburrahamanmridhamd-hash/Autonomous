import React, { useState } from 'react';
import { ArrowRight, Film, MessageSquare, Sparkles, Users } from 'lucide-react';
import { NexoraLogo } from '../components/NexoraBrand';
import { apiFetch } from '../lib/api';
import { ScreenId, UserProfile } from '../types';

export function SplashView({ onNavigate }: { onNavigate: (s: ScreenId) => void }) {
  return (
    <div className="min-h-[78vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-5 rounded-3xl glass-panel shadow-2xl shadow-[#8B5CF6]/20 mb-6">
        <NexoraLogo size={72} />
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight mb-2">NEXORA</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-8">One World. One Platform.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigate('onboarding')}
          className="px-6 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm flex items-center gap-2 hover:opacity-95 transition-opacity"
        >
          <span>Launch Experience</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 min-h-[44px] rounded-xl glass-panel text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

export function OnboardingView({ onNavigate }: { onNavigate: (s: ScreenId) => void }) {
  const [step, setStep] = useState(0);
  const slides = [
    {
      icon: Sparkles,
      title: 'Feeds, Stories & Pulse Threads',
      body: 'Publish photography, short-form thoughts, threaded discussions, and reposts in one cohesive stream.',
    },
    {
      icon: Film,
      title: 'Reels & Long-Form Watch',
      body: 'Swipe vertical Reels or dive into creator Watch channels with playlists and watch history.',
    },
    {
      icon: Users,
      title: 'Communities & Real-Time Chat',
      body: 'Join public or private groups, send voice messages over WebSocket, and draft with server-side Gemini AI.',
    },
  ];
  const current = slides[step];
  const Icon = current.icon;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <NexoraLogo size={32} />
          <span className="font-display font-bold text-lg">NEXORA</span>
        </div>
        <button
          onClick={() => onNavigate('register')}
          className="text-sm font-medium text-[#38BDF8] hover:underline min-h-[44px] px-2"
        >
          Skip to Sign Up
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#38BDF8] to-[#8B5CF6] flex items-center justify-center text-white">
          <Icon className="w-7 h-7" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3 text-balance">{current.title}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
          {current.body}
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                step === i ? 'w-8 bg-[#38BDF8]' : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (step < slides.length - 1) setStep(step + 1);
              else onNavigate('register');
            }}
            className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm"
          >
            {step < slides.length - 1 ? 'Continue' : 'Create NEXORA Account'}
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="min-h-[48px] px-5 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoginView({
  onAuthSuccess,
  onNavigate,
}: {
  onAuthSuccess: (token: string, user: UserProfile) => void;
  onNavigate: (s: ScreenId) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="glass-panel rounded-3xl p-7">
        <div className="flex items-center gap-3 mb-6">
          <NexoraLogo size={36} />
          <div>
            <h2 className="font-display text-2xl font-bold">Sign In</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">One World. One Platform.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-slate-300">Email or Username</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
          <button onClick={() => onNavigate('privacy-center')} className="text-slate-500 dark:text-slate-400 hover:text-[#38BDF8] min-h-[40px]">
            Recover Password
          </button>
          <button onClick={() => onNavigate('register')} className="text-[#38BDF8] font-semibold min-h-[40px]">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterView({
  onAuthSuccess,
  onNavigate,
}: {
  onAuthSuccess: (token: string, user: UserProfile) => void;
  onNavigate: (s: ScreenId) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName, username, email, password, recoveryPhrase }),
      });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <div className="glass-panel rounded-3xl p-7">
        <div className="flex items-center gap-3 mb-5">
          <NexoraLogo size={36} />
          <div>
            <h2 className="font-display text-2xl font-bold">Create Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Join the NEXORA ecosystem</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Maya Lin"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mayalin"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@example.com"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Password (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Account Recovery Phrase</label>
            <input
              type="text"
              required
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              placeholder="Secret word for password reset"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 text-center text-xs">
          <button onClick={() => onNavigate('login')} className="text-[#38BDF8] font-semibold min-h-[40px]">
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
