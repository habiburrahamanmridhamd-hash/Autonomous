import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import bcrypt from 'bcryptjs';
import JSZip from 'jszip';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'nexora-db.json');
const TOKEN_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  recoveryHash: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  followers: string[];
  following: string[];
  subscriptions: string[];
  createdAt: string;
}

interface CommentRecord {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

interface PostRecord {
  id: string;
  authorId: string;
  type: 'feed' | 'pulse' | 'story';
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'none';
  likes: string[];
  saves: string[];
  reposts: string[];
  repostOfId: string | null;
  comments: CommentRecord[];
  createdAt: string;
}

interface ReelRecord {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  likes: string[];
  saves: string[];
  comments: CommentRecord[];
  createdAt: string;
}

interface WatchVideoRecord {
  id: string;
  channelId: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  views: number;
  createdAt: string;
}

interface PlaylistRecord {
  id: string;
  ownerId: string;
  title: string;
  videoIds: string[];
}

interface WatchHistoryEntry {
  userId: string;
  videoId: string;
  watchedAt: string;
}

interface CommunityPostRecord {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

interface CommunityRecord {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  ownerId: string;
  members: string[];
  moderators: string[];
  posts: CommunityPostRecord[];
  createdAt: string;
}

interface MessageRecord {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'voice';
  content: string;
  mediaUrl: string | null;
  createdAt: string;
}

interface ConversationRecord {
  id: string;
  title: string;
  isGroup: boolean;
  participants: string[];
  messages: MessageRecord[];
  createdAt: string;
}

interface NotificationRecord {
  id: string;
  userId: string;
  actorId: string | null;
  kind: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  posts: PostRecord[];
  reels: ReelRecord[];
  watchVideos: WatchVideoRecord[];
  playlists: PlaylistRecord[];
  watchHistory: WatchHistoryEntry[];
  communities: CommunityRecord[];
  conversations: ConversationRecord[];
  notifications: NotificationRecord[];
}

const emptyDb: DatabaseSchema = {
  users: [],
  posts: [],
  reels: [],
  watchVideos: [],
  playlists: [],
  watchHistory: [],
  communities: [],
  conversations: [],
  notifications: [],
};

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2));
    return structuredClone(emptyDb);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return { ...structuredClone(emptyDb), ...JSON.parse(raw) };
  } catch {
    return structuredClone(emptyDb);
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

function publicUser(u: UserRecord) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    coverUrl: u.coverUrl,
    isPrivate: u.isPrivate,
    followers: u.followers,
    following: u.following,
    subscriptions: u.subscriptions,
    followersCount: u.followers.length,
    followingCount: u.following.length,
    createdAt: u.createdAt,
  };
}

interface AuthedRequest extends Request {
  user?: UserRecord;
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const uid = verifyToken(header.slice(7));
    if (uid) {
      req.user = db.users.find((u) => u.id === uid);
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  });
}

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const wsClients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (socket, req) => {
    const url = new URL(req.url || '/ws', 'http://localhost');
    const token = url.searchParams.get('token') || '';
    const userId = verifyToken(token);
    if (!userId) {
      socket.close(4001, 'Unauthorized');
      return;
    }
    if (!wsClients.has(userId)) wsClients.set(userId, new Set());
    wsClients.get(userId)!.add(socket);

    socket.on('close', () => {
      wsClients.get(userId)?.delete(socket);
    });
  });

  function pushToUser(userId: string, event: Record<string, unknown>) {
    const sockets = wsClients.get(userId);
    if (!sockets) return;
    const raw = JSON.stringify(event);
    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) {
        s.send(raw);
      }
    }
  }

  function addNotification(userId: string, actorId: string | null, kind: string, message: string) {
    if (userId === actorId) return;
    const note: NotificationRecord = {
      id: crypto.randomUUID(),
      userId,
      actorId,
      kind,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(note);
    saveDb();
    pushToUser(userId, { type: 'notification', notification: note });
  }

  app.use(express.json({ limit: '35mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'NEXORA', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    const { username, displayName, email, password, recoveryPhrase } = req.body || {};
    if (!username || !displayName || !email || !password || String(password).length < 6) {
      res.status(400).json({ error: 'Username, display name, email, and password (min 6 chars) are required.' });
      return;
    }
    const cleanUser = String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanUser) {
      res.status(400).json({ error: 'Invalid username format.' });
      return;
    }
    if (db.users.some((u) => u.email === cleanEmail || u.username === cleanUser)) {
      res.status(409).json({ error: 'Email or username is already registered.' });
      return;
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const recoveryHash = await bcrypt.hash(String(recoveryPhrase || 'nexora-recovery').trim().toLowerCase(), 10);
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      username: cleanUser,
      displayName: String(displayName).trim(),
      email: cleanEmail,
      passwordHash,
      recoveryHash,
      bio: '',
      avatarUrl: null,
      coverUrl: null,
      isPrivate: false,
      followers: [],
      following: [],
      subscriptions: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb();
    res.status(201).json({ token: signToken(newUser.id), user: publicUser(newUser) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email === cleanEmail || u.username === cleanEmail);
    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  });

  app.post('/api/auth/recover', async (req, res) => {
    const { email, recoveryPhrase, newPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Valid account email and new password (min 6 chars) are required.' });
      return;
    }
    const ok = await bcrypt.compare(String(recoveryPhrase || '').trim().toLowerCase(), user.recoveryHash);
    if (!ok) {
      res.status(403).json({ error: 'Recovery phrase did not match.' });
      return;
    }
    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    saveDb();
    res.json({ status: 'password_updated' });
  });

  // Users
  app.get('/api/users/me', requireAuth, (req: AuthedRequest, res) => {
    res.json(publicUser(req.user!));
  });

  app.patch('/api/users/me', requireAuth, (req: AuthedRequest, res) => {
    const { displayName, bio, avatarUrl, coverUrl, isPrivate } = req.body || {};
    const u = req.user!;
    if (typeof displayName === 'string' && displayName.trim()) u.displayName = displayName.trim();
    if (typeof bio === 'string') u.bio = bio;
    if (avatarUrl !== undefined) u.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) u.coverUrl = coverUrl;
    if (typeof isPrivate === 'boolean') u.isPrivate = isPrivate;
    saveDb();
    res.json(publicUser(u));
  });

  app.delete('/api/users/me', requireAuth, (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    db.users = db.users.filter((u) => u.id !== uid);
    for (const u of db.users) {
      u.followers = u.followers.filter((id) => id !== uid);
      u.following = u.following.filter((id) => id !== uid);
    }
    db.posts = db.posts.filter((p) => p.authorId !== uid);
    db.reels = db.reels.filter((r) => r.authorId !== uid);
    db.watchVideos = db.watchVideos.filter((v) => v.channelId !== uid);
    db.notifications = db.notifications.filter((n) => n.userId !== uid);
    saveDb();
    res.json({ status: 'account_deleted' });
  });

  app.get('/api/users', optionalAuth, (_req, res) => {
    res.json(db.users.map(publicUser));
  });

  app.post('/api/users/:id/follow', requireAuth, (req: AuthedRequest, res) => {
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const me = req.user!;
    if (target.id === me.id) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }
    const already = target.followers.includes(me.id);
    if (already) {
      target.followers = target.followers.filter((id) => id !== me.id);
      me.following = me.following.filter((id) => id !== target.id);
    } else {
      target.followers.push(me.id);
      me.following.push(target.id);
      addNotification(target.id, me.id, 'follow', `${me.displayName} started following you.`);
    }
    saveDb();
    res.json({ following: !already, followersCount: target.followers.length });
  });

  // Media Upload (base64 data URI -> saved in data/uploads)
  app.post('/api/upload', requireAuth, (req: AuthedRequest, res) => {
    const { dataUrl, filename } = req.body || {};
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Expected base64 dataUrl payload.' });
      return;
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Invalid dataUrl encoding.' });
      return;
    }
    const mime = match[1];
    const buf = Buffer.from(match[2], 'base64');
    const extMap: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
    };
    const fallbackExt = path.extname(String(filename || '')) || '.bin';
    const ext = extMap[mime] || fallbackExt;
    const outName = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, outName), buf);
    res.status(201).json({ url: `/uploads/${outName}`, mime });
  });

  // Posts (Feed, Pulse, Stories)
  app.get('/api/posts', optionalAuth, (req: AuthedRequest, res) => {
    const mode = String(req.query.mode || 'personalized');
    let list = [...db.posts];
    if (mode === 'pulse') {
      list = list.filter((p) => p.type === 'pulse');
    } else if (mode === 'stories') {
      list = list.filter((p) => p.type === 'story');
    } else if (mode === 'trending') {
      list.sort((a, b) => (b.likes.length + b.comments.length * 2 + b.reposts.length) - (a.likes.length + a.comments.length * 2 + a.reposts.length));
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const enriched = list.map((p) => {
      const author = db.users.find((u) => u.id === p.authorId);
      return {
        ...p,
        author: author ? publicUser(author) : null,
        comments: p.comments.map((c) => {
          const ca = db.users.find((u) => u.id === c.authorId);
          return { ...c, author: ca ? publicUser(ca) : null };
        }),
      };
    });
    res.json(enriched);
  });

  app.post('/api/posts', requireAuth, (req: AuthedRequest, res) => {
    const { content, type, mediaUrl, mediaType } = req.body || {};
    if (!content && !mediaUrl) {
      res.status(400).json({ error: 'Post content or media is required.' });
      return;
    }
    const post: PostRecord = {
      id: crypto.randomUUID(),
      authorId: req.user!.id,
      type: type === 'pulse' || type === 'story' ? type : 'feed',
      content: String(content || '').trim(),
      mediaUrl: mediaUrl || null,
      mediaType: mediaType === 'image' || mediaType === 'video' ? mediaType : 'none',
      likes: [],
      saves: [],
      reposts: [],
      repostOfId: null,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(post);
    saveDb();
    res.status(201).json({ ...post, author: publicUser(req.user!) });
  });

  app.post('/api/posts/:id/like', requireAuth, (req: AuthedRequest, res) => {
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    const uid = req.user!.id;
    const exists = post.likes.includes(uid);
    post.likes = exists ? post.likes.filter((id) => id !== uid) : [...post.likes, uid];
    if (!exists) addNotification(post.authorId, uid, 'like', `${req.user!.displayName} liked your post.`);
    saveDb();
    res.json({ likes: post.likes });
  });

  app.post('/api/posts/:id/save', requireAuth, (req: AuthedRequest, res) => {
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    const uid = req.user!.id;
    const exists = post.saves.includes(uid);
    post.saves = exists ? post.saves.filter((id) => id !== uid) : [...post.saves, uid];
    saveDb();
    res.json({ saves: post.saves });
  });

  app.post('/api/posts/:id/repost', requireAuth, (req: AuthedRequest, res) => {
    const original = db.posts.find((p) => p.id === req.params.id);
    if (!original) { res.status(404).json({ error: 'Post not found' }); return; }
    const uid = req.user!.id;
    if (!original.reposts.includes(uid)) {
      original.reposts.push(uid);
    }
    const repost: PostRecord = {
      id: crypto.randomUUID(),
      authorId: uid,
      type: 'pulse',
      content: `Reposted @${db.users.find((u) => u.id === original.authorId)?.username || 'creator'}: ${original.content}`,
      mediaUrl: original.mediaUrl,
      mediaType: original.mediaType,
      likes: [],
      saves: [],
      reposts: [],
      repostOfId: original.id,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(repost);
    addNotification(original.authorId, uid, 'repost', `${req.user!.displayName} reposted your Pulse.`);
    saveDb();
    res.status(201).json(repost);
  });

  app.post('/api/posts/:id/comment', requireAuth, (req: AuthedRequest, res) => {
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    const text = String(req.body?.text || '').trim();
    if (!text) { res.status(400).json({ error: 'Comment text required' }); return; }
    const comment: CommentRecord = {
      id: crypto.randomUUID(),
      authorId: req.user!.id,
      text,
      createdAt: new Date().toISOString(),
    };
    post.comments.push(comment);
    addNotification(post.authorId, req.user!.id, 'comment', `${req.user!.displayName} commented: "${text.slice(0, 48)}"`);
    saveDb();
    res.status(201).json({ ...comment, author: publicUser(req.user!) });
  });

  // Reels
  app.get('/api/reels', (_req, res) => {
    const enriched = db.reels.map((r) => {
      const author = db.users.find((u) => u.id === r.authorId);
      return {
        ...r,
        author: author ? publicUser(author) : null,
        comments: r.comments.map((c) => ({ ...c, author: db.users.find((u) => u.id === c.authorId) ? publicUser(db.users.find((u) => u.id === c.authorId)!) : null })),
      };
    });
    res.json(enriched);
  });

  app.post('/api/reels', requireAuth, (req: AuthedRequest, res) => {
    const { caption, videoUrl } = req.body || {};
    if (!videoUrl) { res.status(400).json({ error: 'Video file URL is required.' }); return; }
    const reel: ReelRecord = {
      id: crypto.randomUUID(),
      authorId: req.user!.id,
      caption: String(caption || '').trim(),
      videoUrl,
      likes: [],
      saves: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    db.reels.unshift(reel);
    saveDb();
    res.status(201).json(reel);
  });

  app.post('/api/reels/:id/like', requireAuth, (req: AuthedRequest, res) => {
    const reel = db.reels.find((r) => r.id === req.params.id);
    if (!reel) { res.status(404).json({ error: 'Reel not found' }); return; }
    const uid = req.user!.id;
    reel.likes = reel.likes.includes(uid) ? reel.likes.filter((id) => id !== uid) : [...reel.likes, uid];
    saveDb();
    res.json({ likes: reel.likes });
  });

  app.post('/api/reels/:id/save', requireAuth, (req: AuthedRequest, res) => {
    const reel = db.reels.find((r) => r.id === req.params.id);
    if (!reel) { res.status(404).json({ error: 'Reel not found' }); return; }
    const uid = req.user!.id;
    reel.saves = reel.saves.includes(uid) ? reel.saves.filter((id) => id !== uid) : [...reel.saves, uid];
    saveDb();
    res.json({ saves: reel.saves });
  });

  app.post('/api/reels/:id/comment', requireAuth, (req: AuthedRequest, res) => {
    const reel = db.reels.find((r) => r.id === req.params.id);
    if (!reel) { res.status(404).json({ error: 'Reel not found' }); return; }
    const text = String(req.body?.text || '').trim();
    if (!text) { res.status(400).json({ error: 'Comment text required' }); return; }
    const comment: CommentRecord = { id: crypto.randomUUID(), authorId: req.user!.id, text, createdAt: new Date().toISOString() };
    reel.comments.push(comment);
    saveDb();
    res.status(201).json(comment);
  });

  // Watch (Long Videos, Channels, Subscriptions, Playlists, History)
  app.get('/api/watch', optionalAuth, (req: AuthedRequest, res) => {
    const videos = db.watchVideos.map((v) => {
      const channel = db.users.find((u) => u.id === v.channelId);
      return { ...v, channel: channel ? publicUser(channel) : null };
    });
    const uid = req.user?.id;
    const playlists = uid ? db.playlists.filter((pl) => pl.ownerId === uid) : [];
    const history = uid
      ? db.watchHistory.filter((h) => h.userId === uid).map((h) => ({ ...h, video: videos.find((v) => v.id === h.videoId) || null }))
      : [];
    res.json({ videos, playlists, history });
  });

  app.post('/api/watch', requireAuth, (req: AuthedRequest, res) => {
    const { title, description, videoUrl, duration } = req.body || {};
    if (!title || !videoUrl) { res.status(400).json({ error: 'Title and video file are required.' }); return; }
    const vid: WatchVideoRecord = {
      id: crypto.randomUUID(),
      channelId: req.user!.id,
      title: String(title).trim(),
      description: String(description || '').trim(),
      videoUrl,
      duration: String(duration || '0:30'),
      views: 0,
      createdAt: new Date().toISOString(),
    };
    db.watchVideos.unshift(vid);
    saveDb();
    res.status(201).json(vid);
  });

  app.post('/api/watch/:id/view', optionalAuth, (req: AuthedRequest, res) => {
    const vid = db.watchVideos.find((v) => v.id === req.params.id);
    if (!vid) { res.status(404).json({ error: 'Video not found' }); return; }
    vid.views += 1;
    if (req.user) {
      db.watchHistory = [
        { userId: req.user.id, videoId: vid.id, watchedAt: new Date().toISOString() },
        ...db.watchHistory.filter((h) => !(h.userId === req.user!.id && h.videoId === vid.id)),
      ];
    }
    saveDb();
    res.json({ views: vid.views });
  });

  app.post('/api/watch/subscribe/:channelId', requireAuth, (req: AuthedRequest, res) => {
    const me = req.user!;
    const cid = req.params.channelId;
    const exists = me.subscriptions.includes(cid);
    me.subscriptions = exists ? me.subscriptions.filter((id) => id !== cid) : [...me.subscriptions, cid];
    saveDb();
    res.json({ subscriptions: me.subscriptions });
  });

  app.post('/api/playlists', requireAuth, (req: AuthedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) { res.status(400).json({ error: 'Playlist title required' }); return; }
    const pl: PlaylistRecord = { id: crypto.randomUUID(), ownerId: req.user!.id, title, videoIds: [] };
    db.playlists.unshift(pl);
    saveDb();
    res.status(201).json(pl);
  });

  app.post('/api/playlists/:id/add', requireAuth, (req: AuthedRequest, res) => {
    const pl = db.playlists.find((p) => p.id === req.params.id && p.ownerId === req.user!.id);
    if (!pl) { res.status(404).json({ error: 'Playlist not found' }); return; }
    const videoId = String(req.body?.videoId || '');
    if (videoId && !pl.videoIds.includes(videoId)) pl.videoIds.push(videoId);
    saveDb();
    res.json(pl);
  });

  // Communities
  app.get('/api/communities', (_req, res) => {
    const enriched = db.communities.map((c) => ({
      ...c,
      posts: c.posts.map((p) => ({
        ...p,
        author: db.users.find((u) => u.id === p.authorId) ? publicUser(db.users.find((u) => u.id === p.authorId)!) : null,
      })),
    }));
    res.json(enriched);
  });

  app.post('/api/communities', requireAuth, (req: AuthedRequest, res) => {
    const { name, description, privacy } = req.body || {};
    if (!name) { res.status(400).json({ error: 'Community name required' }); return; }
    const c: CommunityRecord = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      description: String(description || '').trim(),
      privacy: privacy === 'private' ? 'private' : 'public',
      ownerId: req.user!.id,
      members: [req.user!.id],
      moderators: [req.user!.id],
      posts: [],
      createdAt: new Date().toISOString(),
    };
    db.communities.unshift(c);
    saveDb();
    res.status(201).json(c);
  });

  app.post('/api/communities/:id/join', requireAuth, (req: AuthedRequest, res) => {
    const c = db.communities.find((item) => item.id === req.params.id);
    if (!c) { res.status(404).json({ error: 'Community not found' }); return; }
    const uid = req.user!.id;
    const member = c.members.includes(uid);
    c.members = member ? c.members.filter((id) => id !== uid) : [...c.members, uid];
    saveDb();
    res.json({ members: c.members });
  });

  app.post('/api/communities/:id/posts', requireAuth, (req: AuthedRequest, res) => {
    const c = db.communities.find((item) => item.id === req.params.id);
    if (!c) { res.status(404).json({ error: 'Community not found' }); return; }
    const text = String(req.body?.text || '').trim();
    if (!text) { res.status(400).json({ error: 'Message required' }); return; }
    const post: CommunityPostRecord = { id: crypto.randomUUID(), authorId: req.user!.id, text, createdAt: new Date().toISOString() };
    c.posts.unshift(post);
    saveDb();
    res.status(201).json({ ...post, author: publicUser(req.user!) });
  });

  app.delete('/api/communities/:id/posts/:postId', requireAuth, (req: AuthedRequest, res) => {
    const c = db.communities.find((item) => item.id === req.params.id);
    if (!c) { res.status(404).json({ error: 'Community not found' }); return; }
    const uid = req.user!.id;
    const post = c.posts.find((p) => p.id === req.params.postId);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    if (c.ownerId !== uid && !c.moderators.includes(uid) && post.authorId !== uid) {
      res.status(403).json({ error: 'Moderator permission required' });
      return;
    }
    c.posts = c.posts.filter((p) => p.id !== req.params.postId);
    saveDb();
    res.json({ status: 'moderated' });
  });

  // Messages & Group Chats
  app.get('/api/conversations', requireAuth, (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    const mine = db.conversations
      .filter((c) => c.participants.includes(uid))
      .map((c) => ({
        ...c,
        participantUsers: c.participants.map((pid) => db.users.find((u) => u.id === pid)).filter(Boolean).map((u) => publicUser(u!)),
      }));
    res.json(mine);
  });

  app.post('/api/conversations', requireAuth, (req: AuthedRequest, res) => {
    const { participantIds, title, isGroup } = req.body || {};
    const ids = Array.from(new Set([req.user!.id, ...(Array.isArray(participantIds) ? participantIds : [])]));
    if (!isGroup && ids.length === 2) {
      const existing = db.conversations.find(
        (c) => !c.isGroup && c.participants.length === 2 && ids.every((id) => c.participants.includes(id))
      );
      if (existing) {
        res.json(existing);
        return;
      }
    }
    const conv: ConversationRecord = {
      id: crypto.randomUUID(),
      title: String(title || 'Direct Conversation').trim(),
      isGroup: Boolean(isGroup),
      participants: ids,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    db.conversations.unshift(conv);
    saveDb();
    res.status(201).json(conv);
  });

  app.post('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
    const conv = db.conversations.find((c) => c.id === req.params.id && c.participants.includes(req.user!.id));
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return; }
    const { type, content, mediaUrl } = req.body || {};
    const msg: MessageRecord = {
      id: crypto.randomUUID(),
      senderId: req.user!.id,
      type: type === 'image' || type === 'voice' ? type : 'text',
      content: String(content || '').trim(),
      mediaUrl: mediaUrl || null,
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(msg);
    saveDb();
    for (const pid of conv.participants) {
      pushToUser(pid, { type: 'chat_message', conversationId: conv.id, message: msg });
      if (pid !== req.user!.id) {
        addNotification(pid, req.user!.id, 'message', `${req.user!.displayName} sent you a message.`);
      }
    }
    res.status(201).json(msg);
  });

  // Notifications
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    res.json(db.notifications.filter((n) => n.userId === req.user!.id));
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    for (const n of db.notifications) {
      if (n.userId === req.user!.id) n.isRead = true;
    }
    saveDb();
    res.json({ status: 'ok' });
  });

  // Gemini AI Assistant (Server-Side Only)
  app.post('/api/ai/assist', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
      return;
    }
    const { mode, prompt, targetLanguage } = req.body || {};
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      res.status(400).json({ error: 'Prompt text is required.' });
      return;
    }
    const instructionMap: Record<string, string> = {
      caption: `Write a crisp, high-impact social media caption (under 40 words) for: ${cleanPrompt}`,
      hashtags: `Generate 6 clean, high-relevance hashtags separated by spaces for: ${cleanPrompt}`,
      write: `Draft an engaging, authentic social media post (2-3 sentences) about: ${cleanPrompt}`,
      translate: `Translate the following social post naturally into ${targetLanguage || 'Spanish'}, returning only the translation: ${cleanPrompt}`,
      recommend: `Suggest 4 creative content angles or follow-up post ideas based on: ${cleanPrompt}`,
    };
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: instructionMap[String(mode)] || cleanPrompt,
      });
      res.json({ result: response.text || '' });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Gemini AI request failed.' });
    }
  });

  app.get('/api/ai/search', async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const matchedUsers = db.users.filter((u) => u.username.includes(q) || u.displayName.toLowerCase().includes(q)).map(publicUser);
    const matchedPosts = db.posts.filter((p) => p.content.toLowerCase().includes(q));
    const matchedCommunities = db.communities.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    let aiInsight = '';
    const ai = getAiClient();
    if (ai && q.length >= 2) {
      try {
        const resp = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `In 2 concise sentences, summarize creative trends or search angles related to "${q}" for a social creator.`,
        });
        aiInsight = resp.text || '';
      } catch {
        aiInsight = '';
      }
    }
    res.json({ users: matchedUsers, posts: matchedPosts, communities: matchedCommunities, aiInsight });
  });

  app.get('/api/ai/discover', async (_req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
      return;
    }
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: 'List 5 short, fresh creative themes (3-5 words each, one per line, no bullets or numbers) trending in photography, mobile filmmaking, architecture, and audio design.',
      });
      const topics = (resp.text || '')
        .split('\n')
        .map((l) => l.replace(/^[-*\d.\s]+/, '').trim())
        .filter(Boolean)
        .slice(0, 5);
      res.json({ topics });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Discovery request failed.' });
    }
  });

  // Android Studio & FastAPI Project Inspector + ZIP Export
  function walkProjectFiles(baseDir: string, prefix: string): { path: string; size: number }[] {
    if (!fs.existsSync(baseDir)) return [];
    const out: { path: string; size: number }[] = [];
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      const abs = path.join(baseDir, entry.name);
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        out.push(...walkProjectFiles(abs, rel));
      } else {
        out.push({ path: rel, size: fs.statSync(abs).size });
      }
    }
    return out;
  }

  app.get('/api/project/files', (_req, res) => {
    const androidFiles = walkProjectFiles(path.join(ROOT_DIR, 'nexora_android'), 'nexora_android');
    const backendFiles = walkProjectFiles(path.join(ROOT_DIR, 'nexora_backend'), 'nexora_backend');
    const docs = fs.existsSync(path.join(ROOT_DIR, 'BUILD_APK.md'))
      ? [{ path: 'BUILD_APK.md', size: fs.statSync(path.join(ROOT_DIR, 'BUILD_APK.md')).size }]
      : [];
    res.json({
      environment: {
        flutterInstalled: false,
        androidSdkInstalled: false,
        apkCompiledInCloudSandbox: false,
        targetApplicationId: 'com.nexora.social',
        expectedApkPath: 'nexora_android/build/app/outputs/flutter-apk/app-release.apk',
      },
      files: [...docs, ...androidFiles, ...backendFiles],
    });
  });

  app.get('/api/project/file', (req, res) => {
    const rel = String(req.query.path || '');
    const safePrefixes = ['nexora_android/', 'nexora_backend/', 'BUILD_APK.md'];
    if (!safePrefixes.some((p) => rel === p || rel.startsWith(p))) {
      res.status(400).json({ error: 'Invalid project file path' });
      return;
    }
    const abs = path.resolve(ROOT_DIR, rel);
    if (!abs.startsWith(ROOT_DIR) || !fs.existsSync(abs)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.json({ path: rel, content: fs.readFileSync(abs, 'utf-8') });
  });

  app.get('/api/project/export.zip', async (_req, res) => {
    const zip = new JSZip();
    const files = [
      ...walkProjectFiles(path.join(ROOT_DIR, 'nexora_android'), 'nexora_android'),
      ...walkProjectFiles(path.join(ROOT_DIR, 'nexora_backend'), 'nexora_backend'),
    ];
    if (fs.existsSync(path.join(ROOT_DIR, 'BUILD_APK.md'))) {
      zip.file('BUILD_APK.md', fs.readFileSync(path.join(ROOT_DIR, 'BUILD_APK.md')));
    }
    for (const f of files) {
      zip.file(f.path, fs.readFileSync(path.join(ROOT_DIR, f.path)));
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="nexora-android-studio-kit.zip"');
    res.send(buffer);
  });

  // Vite middleware for dev / static dist in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
    app.use(express.static(path.join(ROOT_DIR, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(ROOT_DIR, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXORA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
