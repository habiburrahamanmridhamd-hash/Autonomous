import React, { useState } from 'react';
import { Image as ImageIcon, Languages, Sparkles, Upload, Video } from 'lucide-react';
import { apiFetch, uploadMediaFile } from '../lib/api';
import { ScreenId } from '../types';

export function CreatePostView({
  token,
  onCreated,
  onNavigate,
  onNotify,
}: {
  token: string | null;
  onCreated: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [postType, setPostType] = useState<'feed' | 'pulse' | 'story'>('feed');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('Spanish');
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');

  async function handleAi(mode: 'caption' | 'hashtags' | 'write' | 'translate' | 'recommend') {
    const prompt = content.trim() || 'modern mobile filmmaking and architecture';
    setBusy(true);
    setAiNote('');
    try {
      const res = await apiFetch<{ result: string }>('/api/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ mode, prompt, targetLanguage: targetLang }),
      });
      if (mode === 'recommend') {
        setAiNote(res.result);
      } else if (mode === 'hashtags') {
        setContent((prev) => `${prev.trim()}\n\n${res.result.trim()}`.trim());
      } else {
        setContent(res.result.trim());
      }
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : 'AI assistant unavailable');
    } finally {
      setBusy(false);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      onNotify('Please sign in first.');
      onNavigate('login');
      return;
    }
    if (!content.trim() && !mediaFile) return;
    setBusy(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | 'none' = 'none';
      if (mediaFile) {
        const up = await uploadMediaFile(mediaFile, mediaFile.name, token);
        mediaUrl = up.url;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }
      await apiFetch(
        '/api/posts',
        {
          method: 'POST',
          body: JSON.stringify({ type: postType, content, mediaUrl, mediaType }),
        },
        token
      );
      setContent('');
      setMediaFile(null);
      setPreviewUrl(null);
      onNotify('Published to NEXORA');
      onCreated();
      onNavigate('home');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Create</h2>
        <button
          onClick={() => onNavigate('upload-video')}
          className="px-4 py-2 min-h-[40px] rounded-xl glass-panel text-xs font-semibold flex items-center gap-1.5"
        >
          <Video className="w-4 h-4 text-[#38BDF8]" />
          <span>Upload Reel / Watch</span>
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 glass-panel rounded-xl w-fit">
        {([
          ['feed', 'Feed Post'],
          ['pulse', 'Pulse Thread'],
          ['story', 'Story'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setPostType(val)}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap ${
              postType === val ? 'bg-[#8B5CF6] text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={publish} className="glass-panel rounded-3xl p-5 space-y-4">
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a post, Pulse thread, or topic prompt for Gemini AI..."
          className="w-full p-3.5 rounded-2xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
        />

        {previewUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
            {mediaFile?.type.startsWith('video/') ? (
              <video src={previewUrl} controls className="w-full max-h-64" />
            ) : (
              <img src={previewUrl} alt="Upload preview" className="w-full max-h-64 object-cover" />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer px-3.5 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/15 text-xs font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10">
            <ImageIcon className="w-4 h-4 text-[#38BDF8]" />
            <span>{mediaFile ? mediaFile.name : 'Attach Photo / Video'}</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setMediaFile(f);
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
            />
          </label>
        </div>

        {/* Gemini AI Studio Toolbar */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI Assistant</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAi('write')}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium"
            >
              Draft Post
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAi('caption')}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium"
            >
              Generate Caption
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAi('hashtags')}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium"
            >
              Suggest Hashtags
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAi('recommend')}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium"
            >
              Content Ideas
            </button>
            <div className="flex items-center gap-1">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="min-h-[40px] px-2 rounded-lg bg-slate-100 dark:bg-white/10 text-xs"
              >
                <option>Spanish</option>
                <option>French</option>
                <option>Japanese</option>
                <option>Arabic</option>
                <option>German</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAi('translate')}
                className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium flex items-center gap-1"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Translate</span>
              </button>
            </div>
          </div>
          {aiNote && <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap pt-1">{aiNote}</p>}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm disabled:opacity-60"
        >
          {busy ? 'Publishing...' : 'Publish Now'}
        </button>
      </form>
    </div>
  );
}

export function UploadVideoView({
  token,
  onUploaded,
  onNavigate,
  onNotify,
}: {
  token: string | null;
  onUploaded: () => void;
  onNavigate: (s: ScreenId) => void;
  onNotify: (msg: string) => void;
}) {
  const [target, setTarget] = useState<'reel' | 'watch'>('reel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      onNotify('Sign in to upload videos.');
      onNavigate('login');
      return;
    }
    if (!videoFile) {
      onNotify('Select a video file first.');
      return;
    }
    setUploading(true);
    try {
      const up = await uploadMediaFile(videoFile, videoFile.name, token);
      if (target === 'reel') {
        await apiFetch('/api/reels', { method: 'POST', body: JSON.stringify({ caption: title, videoUrl: up.url }) }, token);
        onUploaded();
        onNavigate('reels');
      } else {
        await apiFetch(
          '/api/watch',
          { method: 'POST', body: JSON.stringify({ title, description, videoUrl: up.url, duration: '1:00' }) },
          token
        );
        onUploaded();
        onNavigate('watch');
      }
      onNotify('Video uploaded');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <h2 className="font-display text-2xl font-bold">Upload Video</h2>
      <form onSubmit={submit} className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/10 rounded-xl w-fit">
          {([
            ['reel', 'Vertical Reel'],
            ['watch', 'Long Watch Video'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTarget(val)}
              className={`px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold ${
                target === val ? 'bg-[#8B5CF6] text-white' : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={target === 'reel' ? 'Reel caption...' : 'Episode title...'}
          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
        />

        {target === 'watch' && (
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Video description..."
            className="w-full p-3.5 rounded-xl bg-white/80 dark:bg-[#080B14]/70 border border-slate-200 dark:border-white/15 text-sm"
          />
        )}

        <label className="cursor-pointer flex items-center justify-center gap-2 min-h-[90px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 text-sm font-medium p-4 text-center">
          <Upload className="w-5 h-5 text-[#38BDF8]" />
          <span>{videoFile ? videoFile.name : 'Choose MP4 or WebM video from device'}</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          type="submit"
          disabled={uploading}
          className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#8B5CF6] text-white font-semibold text-sm disabled:opacity-60"
        >
          {uploading ? 'Uploading video...' : 'Publish Video'}
        </button>
      </form>
    </div>
  );
}
