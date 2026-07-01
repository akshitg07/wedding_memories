/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  passwordHash?: string; // Excluded in client responses
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  joinDate: string;
}

export interface MemoryMetadata {
  width?: number;
  height?: number;
  cameraModel?: string;
  exposure?: string;
  focalLength?: string;
  iso?: number;
  fNumber?: string;
  duration?: number; // For videos
}

export interface Memory {
  id: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  type: 'image' | 'video';
  size: number;
  uploadDate: string;
  albumId: string | null;
  likes: string[]; // List of userIds who liked it
  metadata: MemoryMetadata;
  isApproved: boolean;
}

export interface Album {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  createdAt: string;
  parentId?: string | null; // For nested folders
}

export interface Comment {
  id: string;
  memoryId: string;
  userId: string;
  username: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  type: 'like' | 'comment' | 'announcement' | 'album';
  targetId: string | null; // e.g. memoryId or albumId
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface SambaSettings {
  enabled: boolean;
  type: 'mount' | 'direct';
  mountPath: string;      // E.g. /mnt/samba/wedding
  smbHost: string;        // E.g. 192.168.1.100
  smbShare: string;       // E.g. photos
  smbUser: string;
  smbPass: string;
  smbDomain?: string;
  remoteFolder: string;   // E.g. wedding_photos (inside the share)
  autoSync: boolean;
  lastSyncTime?: string;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success';
  syncMessage?: string;
}

export interface SiteSettings {
  siteName: string;
  requireModeration: boolean;
  allowDownloads: boolean;
  primaryColor: string;
  samba?: SambaSettings;
}

export interface DbSchema {
  users: User[];
  memories: Memory[];
  albums: Album[];
  comments: Comment[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  settings: SiteSettings;
}
