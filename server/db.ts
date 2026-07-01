/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import { DbSchema, User, Memory, Album, Comment, Notification, ActivityLog, SiteSettings } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure database directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Default Site Settings
const defaultSettings: SiteSettings = {
  siteName: 'Our Wedding Memories',
  requireModeration: false,
  allowDownloads: true,
  primaryColor: '#db2777', // Tailwind pink-600
};

// Seed default albums
const defaultAlbums: Album[] = [
  { id: 'haldi', name: 'Haldi Ceremony', description: 'Moments from the vibrant Haldi celebrations.', coverUrl: null, createdAt: new Date().toISOString() },
  { id: 'mehendi', name: 'Mehendi Ceremony', description: 'Intricate henna designs and playful dances.', coverUrl: null, createdAt: new Date().toISOString() },
  { id: 'sangeet', name: 'Sangeet Night', description: 'An evening of music, dance, and celebration.', coverUrl: null, createdAt: new Date().toISOString() },
  { id: 'wedding', name: 'The Wedding Ceremony', description: 'Our sacred vows and beautiful rituals.', coverUrl: null, createdAt: new Date().toISOString() },
  { id: 'reception', name: 'The Grand Reception', description: 'Dining, toasts, and first dances as newlyweds.', coverUrl: null, createdAt: new Date().toISOString() },
  { id: 'candid', name: 'Candid Moments', description: 'Unscripted smiles and beautiful spontaneous memories.', coverUrl: null, createdAt: new Date().toISOString() }
];

// Helper to initialize the DB file with default values
function getInitialDb(): DbSchema {
  const adminPasswordHash = bcryptjs.hashSync('admin123', 10);
  const guestPasswordHash = bcryptjs.hashSync('guest123', 10);

  const defaultUsers: User[] = [
    {
      id: 'admin-uuid',
      username: 'admin',
      passwordHash: adminPasswordHash,
      displayName: 'The Wedding Host',
      avatarUrl: null,
      role: 'admin',
      isActive: true,
      joinDate: new Date().toISOString(),
    },
    {
      id: 'guest-uuid',
      username: 'guest',
      passwordHash: guestPasswordHash,
      displayName: 'Honored Guest',
      avatarUrl: null,
      role: 'user',
      isActive: true,
      joinDate: new Date().toISOString(),
    }
  ];

  return {
    users: defaultUsers,
    memories: [],
    albums: defaultAlbums,
    comments: [],
    notifications: [],
    activityLogs: [
      {
        id: 'init-log-id',
        userId: 'admin-uuid',
        username: 'admin',
        action: 'DB_INIT',
        details: 'Wedding Database successfully initialized with seed data.',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString(),
      }
    ],
    settings: defaultSettings,
  };
}

// Read database from file with fallback and atomic thread-safe lock
export function readDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content) as DbSchema;
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  const initialDb = getInitialDb();
  writeDb(initialDb);
  return initialDb;
}

// Atomic file write to avoid corruption
export function writeDb(data: DbSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Database Repository implementations
export const DB = {
  // Config / Settings
  getSettings(): SiteSettings {
    const db = readDb();
    return db.settings || defaultSettings;
  },

  updateSettings(settings: Partial<SiteSettings>): SiteSettings {
    const db = readDb();
    db.settings = { ...db.settings, ...settings };
    writeDb(db);
    return db.settings;
  },

  // Users Repository
  getUsers(): User[] {
    const db = readDb();
    return db.users;
  },

  getUserById(id: string): User | undefined {
    const db = readDb();
    return db.users.find((u) => u.id === id);
  },

  getUserByUsername(username: string): User | undefined {
    const db = readDb();
    return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  createUser(user: User): User {
    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
  },

  updateUser(id: string, updates: Partial<User>): User {
    const db = readDb();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    db.users[index] = { ...db.users[index], ...updates };
    writeDb(db);
    return db.users[index];
  },

  deleteUser(id: string): void {
    const db = readDb();
    db.users = db.users.filter((u) => u.id !== id);
    writeDb(db);
  },

  // Memories Repository
  getMemories(): Memory[] {
    const db = readDb();
    return db.memories;
  },

  getApprovedMemories(): Memory[] {
    const db = readDb();
    return db.memories.filter(m => m.isApproved);
  },

  getMemoryById(id: string): Memory | undefined {
    const db = readDb();
    return db.memories.find((m) => m.id === id);
  },

  createMemory(memory: Memory): Memory {
    const db = readDb();
    db.memories.push(memory);
    writeDb(db);
    return memory;
  },

  updateMemory(id: string, updates: Partial<Memory>): Memory {
    const db = readDb();
    const index = db.memories.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Memory not found');
    db.memories[index] = { ...db.memories[index], ...updates };
    writeDb(db);
    return db.memories[index];
  },

  deleteMemory(id: string): void {
    const db = readDb();
    const memory = db.memories.find(m => m.id === id);
    if (memory) {
      // Remove file
      const filePath = path.join(UPLOADS_DIR, memory.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete file: ${filePath}`, e);
        }
      }
    }
    db.memories = db.memories.filter((m) => m.id !== id);
    db.comments = db.comments.filter((c) => c.memoryId !== id);
    writeDb(db);
  },

  // Albums Repository
  getAlbums(): Album[] {
    const db = readDb();
    return db.albums;
  },

  getAlbumById(id: string): Album | undefined {
    const db = readDb();
    return db.albums.find((a) => a.id === id);
  },

  createAlbum(album: Album): Album {
    const db = readDb();
    db.albums.push(album);
    writeDb(db);
    return album;
  },

  updateAlbum(id: string, updates: Partial<Album>): Album {
    const db = readDb();
    const index = db.albums.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Album not found');
    db.albums[index] = { ...db.albums[index], ...updates };
    writeDb(db);
    return db.albums[index];
  },

  deleteAlbum(id: string): void {
    const db = readDb();
    db.albums = db.albums.filter((a) => a.id !== id);
    // Unset albumId from memories
    db.memories = db.memories.map((m) => (m.albumId === id ? { ...m, albumId: null } : m));
    writeDb(db);
  },

  // Comments Repository
  getComments(memoryId?: string): Comment[] {
    const db = readDb();
    if (memoryId) {
      return db.comments.filter((c) => c.memoryId === memoryId);
    }
    return db.comments;
  },

  addComment(comment: Comment): Comment {
    const db = readDb();
    db.comments.push(comment);
    writeDb(db);
    return comment;
  },

  deleteComment(id: string): void {
    const db = readDb();
    db.comments = db.comments.filter((c) => c.id !== id);
    writeDb(db);
  },

  // Notifications Repository
  getNotifications(userId: string): Notification[] {
    const db = readDb();
    return db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createNotification(notification: Notification): Notification {
    const db = readDb();
    db.notifications.push(notification);
    writeDb(db);
    return notification;
  },

  markNotificationsRead(userId: string): void {
    const db = readDb();
    db.notifications = db.notifications.map((n) => (n.userId === userId ? { ...n, isRead: true } : n));
    writeDb(db);
  },

  // Activity Logs Repository
  getActivityLogs(): ActivityLog[] {
    const db = readDb();
    return db.activityLogs || [];
  },

  logActivity(userId: string | null, username: string | null, action: string, details: string, ip: string = 'unknown'): ActivityLog {
    const db = readDb();
    const log: ActivityLog = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      username,
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
    };
    db.activityLogs = db.activityLogs || [];
    db.activityLogs.push(log);
    // Cap log history at 500 to save memory/storage
    if (db.activityLogs.length > 500) {
      db.activityLogs.shift();
    }
    writeDb(db);
    return log;
  },
};
