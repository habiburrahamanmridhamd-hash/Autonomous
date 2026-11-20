export type ScreenId =
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'register'
  | 'home'
  | 'reels'
  | 'watch'
  | 'explore'
  | 'create-post'
  | 'upload-video'
  | 'messages'
  | 'chat-details'
  | 'notifications'
  | 'profile'
  | 'edit-profile'
  | 'communities'
  | 'creator-studio'
  | 'settings'
  | 'privacy-center'
  | 'search'
  | 'android-kit';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  followers: string[];
  following: string[];
  subscriptions: string[];
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  author: UserProfile | null;
}

export interface SocialPost {
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
  comments: PostComment[];
  createdAt: string;
  author: UserProfile | null;
}

export interface ReelItem {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  likes: string[];
  saves: string[];
  comments: PostComment[];
  createdAt: string;
  author: UserProfile | null;
}

export interface WatchVideo {
  id: string;
  channelId: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  views: number;
  createdAt: string;
  channel: UserProfile | null;
}

export interface Playlist {
  id: string;
  ownerId: string;
  title: string;
  videoIds: string[];
}

export interface WatchHistoryItem {
  userId: string;
  videoId: string;
  watchedAt: string;
  video: WatchVideo | null;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  author: UserProfile | null;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  ownerId: string;
  members: string[];
  moderators: string[];
  posts: CommunityPost[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'voice';
  content: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  isGroup: boolean;
  participants: string[];
  participantUsers?: UserProfile[];
  messages: ChatMessage[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string | null;
  kind: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
