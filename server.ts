/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import { DB } from './server/db';
import { runSambaSync, getSyncLogs } from './server/sambaService';
import { User, Memory, Album, Comment, Notification, SiteSettings } from './src/types';

// Constants
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'wedding-memories-secret-key-2026';
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Config for local file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `memory-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
});

// Create Express App
const app = express();
app.use(express.json());

// Helper function to resolve allowed album IDs recursively
function getAllowedAlbumIds(user: User, albums: Album[]): string[] | null {
  if (user.role === 'admin' || !user.allowedAlbumIds || user.allowedAlbumIds.length === 0) {
    return null; // admin or unrestricted users can see all
  }
  
  const allowed = new Set<string>();
  
  // Helper to add album and all its descendants recursively
  const addFolderAndDescendants = (albumId: string) => {
    if (allowed.has(albumId)) return;
    allowed.add(albumId);
    
    // Find children of this folder
    const children = albums.filter(a => a.parentId === albumId);
    children.forEach(child => addFolderAndDescendants(child.id));
  };
  
  user.allowedAlbumIds.forEach(id => addFolderAndDescendants(id));
  return Array.from(allowed);
}

// Set up statics for uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Express Request custom typing for JWT
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'user';
  };
}

// Authentication Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please log in.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
      return;
    }
    req.user = user as AuthenticatedRequest['user'];
    next();
  });
}

// Admin checking middleware
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  next();
}

// Utility to get IP address
function getIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// --- Authentication Endpoints ---

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const user = DB.getUserByUsername(username);
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid username, or account is disabled.' });
    return;
  }

  const isMatch = user.passwordHash ? bcryptjs.compareSync(password, user.passwordHash) : false;
  if (!isMatch) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' } // Long-lived for ease of wedding guests
  );

  DB.logActivity(user.id, user.username, 'LOGIN', 'Logged in successfully.', getIp(req));

  const { passwordHash, ...userResponse } = user;
  res.json({ token, user: userResponse });
});

// Check current user
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const user = DB.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const { passwordHash, ...userResponse } = user;
  res.json(userResponse);
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const { displayName, avatarUrl } = req.body;
  if (!displayName || displayName.trim() === '') {
    res.status(400).json({ error: 'Display name cannot be empty.' });
    return;
  }

  try {
    const updated = DB.updateUser(req.user.id, {
      displayName,
      avatarUrl: avatarUrl || null,
    });
    DB.logActivity(req.user.id, req.user.username, 'PROFILE_UPDATE', 'Updated display name or avatar.', getIp(req));
    const { passwordHash, ...userResponse } = updated;
    res.json(userResponse);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Change Password
app.put('/api/auth/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  const user = DB.getUserById(req.user.id);
  if (!user || !user.passwordHash) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const isMatch = bcryptjs.compareSync(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const newHash = bcryptjs.hashSync(newPassword, 10);
  DB.updateUser(req.user.id, { passwordHash: newHash });
  DB.logActivity(req.user.id, req.user.username, 'CHANGE_PASSWORD', 'Changed account password.', getIp(req));

  res.json({ message: 'Password updated successfully.' });
});

// --- Settings Endpoints ---
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(DB.getSettings());
});

app.put('/api/settings', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = DB.updateSettings(req.body);
  DB.logActivity(req.user?.id || null, req.user?.username || null, 'SETTINGS_UPDATE', 'Updated site configuration.', getIp(req));
  res.json(updated);
});

// --- Samba Endpoints ---
app.get('/api/samba/config', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const settings = DB.getSettings();
  res.json(settings.samba || {
    enabled: false,
    type: 'mount',
    mountPath: '',
    smbHost: '',
    smbShare: '',
    smbUser: '',
    smbPass: '',
    remoteFolder: '',
    autoSync: false,
  });
});

app.put('/api/samba/config', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const settings = DB.getSettings();
  const currentSamba: any = settings.samba || {};
  const updatedSamba = {
    ...currentSamba,
    ...req.body,
    syncStatus: req.body.syncStatus !== undefined ? req.body.syncStatus : (currentSamba.syncStatus || 'idle'),
    syncMessage: req.body.syncMessage !== undefined ? req.body.syncMessage : (currentSamba.syncMessage || ''),
    lastSyncTime: currentSamba.lastSyncTime,
  };

  const updatedSettings = DB.updateSettings({ samba: updatedSamba });
  DB.logActivity(req.user?.id || null, req.user?.username || null, 'SAMBA_CONFIG_UPDATE', 'Updated Samba integration settings.', getIp(req));
  res.json(updatedSettings.samba);
});

app.post('/api/samba/sync', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  runSambaSync().catch((err) => {
    console.error('Unhandled Samba sync error in background:', err);
  });
  res.json({ message: 'Samba / SMB Sync run initiated in the background.' });
});

app.get('/api/samba/logs', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ logs: getSyncLogs() });
});

// --- Albums Endpoints ---
app.get('/api/albums', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const albums = DB.getAlbums();
  const user = DB.getUserById(req.user!.id);
  if (user && user.role !== 'admin') {
    const allowedIds = getAllowedAlbumIds(user, albums);
    if (allowedIds !== null) {
      res.json(albums.filter((a) => allowedIds.includes(a.id)));
      return;
    }
  }
  res.json(albums);
});

app.post('/api/albums', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, description, coverUrl, parentId } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Album name is required.' });
    return;
  }
  const newAlbum = DB.createAlbum({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: description || '',
    coverUrl: coverUrl || null,
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
  });

  // Notify everyone of new album
  const users = DB.getUsers();
  users.forEach((user) => {
    if (user.id !== req.user?.id) {
      DB.createNotification({
        id: Math.random().toString(36).substring(2, 11),
        userId: user.id,
        text: `New album "${name}" has been created! Browse memories now.`,
        type: 'album',
        targetId: newAlbum.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  DB.logActivity(req.user?.id || null, req.user?.username || null, 'ALBUM_CREATE', `Created album: ${name}`, getIp(req));
  res.json(newAlbum);
});

app.put('/api/albums/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = DB.updateAlbum(req.params.id, req.body);
    DB.logActivity(req.user?.id || null, req.user?.username || null, 'ALBUM_UPDATE', `Updated album details for id: ${req.params.id}`, getIp(req));
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/albums/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    DB.deleteAlbum(req.params.id);
    DB.logActivity(req.user?.id || null, req.user?.username || null, 'ALBUM_DELETE', `Deleted album id: ${req.params.id}`, getIp(req));
    res.json({ message: 'Album deleted.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Memories Endpoints ---

// Get all memories
app.get('/api/memories', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const memories = DB.getMemories();
  const settings = DB.getSettings();

  // If normal guest, filter by approved unless settings say no moderation
  let filtered = memories;
  if (req.user?.role !== 'admin' && settings.requireModeration) {
    filtered = memories.filter((m) => m.isApproved || m.uploaderId === req.user?.id);
  }

  // Filter by allowedAlbumIds for guest users
  const user = DB.getUserById(req.user!.id);
  if (user && user.role !== 'admin') {
    const albums = DB.getAlbums();
    const allowedIds = getAllowedAlbumIds(user, albums);
    if (allowedIds !== null) {
      filtered = filtered.filter((m) => m.albumId === null || (m.albumId && allowedIds.includes(m.albumId)));
    }
  }

  // Filter by albumId
  const albumId = req.query.albumId as string;
  if (albumId) {
    filtered = filtered.filter((m) => m.albumId === albumId);
  }

  // Filter by search query
  const query = (req.query.q as string)?.toLowerCase();
  if (query) {
    filtered = filtered.filter((m) => {
      return (
        m.originalName.toLowerCase().includes(query) ||
        m.uploaderName.toLowerCase().includes(query) ||
        m.metadata?.cameraModel?.toLowerCase().includes(query)
      );
    });
  }

  // Sort
  const sort = req.query.sort as string;
  if (sort === 'oldest') {
    filtered.sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
  } else if (sort === 'likes') {
    filtered.sort((a, b) => b.likes.length - a.likes.length);
  } else {
    // default: newest
    filtered.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }

  res.json(filtered);
});

// Upload Memory
app.post(
  '/api/memories/upload',
  authenticateToken,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const { albumId, width, height, cameraModel, exposure, focalLength, iso, fNumber, duration } = req.body;

    const user = DB.getUserById(req.user!.id);
    const settings = DB.getSettings();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isVideo = req.file.mimetype.startsWith('video/') || ['.mp4', '.mov', '.mkv', '.avi', '.mpg', '.mpeg', '.m4v'].includes(ext);
    const type = isVideo ? 'video' : 'image';

    const metadata = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      cameraModel: cameraModel || undefined,
      exposure: exposure || undefined,
      focalLength: focalLength || undefined,
      iso: iso ? parseInt(iso) : undefined,
      fNumber: fNumber || undefined,
      duration: duration ? parseFloat(duration) : undefined,
    };

    const newMemory: Memory = {
      id: Math.random().toString(36).substring(2, 11),
      uploaderId: req.user!.id,
      uploaderName: user?.displayName || req.user!.username,
      uploaderAvatar: user?.avatarUrl || null,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      type,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      albumId: albumId || null,
      likes: [],
      metadata,
      isApproved: req.user!.role === 'admin' ? true : !settings.requireModeration,
    };

    DB.createMemory(newMemory);

    // Notify administrators if pending approval
    if (!newMemory.isApproved) {
      const admins = DB.getUsers().filter((u) => u.role === 'admin');
      admins.forEach((admin) => {
        DB.createNotification({
          id: Math.random().toString(36).substring(2, 11),
          userId: admin.id,
          text: `New upload "${newMemory.originalName}" by ${newMemory.uploaderName} requires moderation approval.`,
          type: 'announcement',
          targetId: newMemory.id,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
    }

    DB.logActivity(
      req.user!.id,
      req.user!.username,
      'UPLOAD',
      `Uploaded memory file: ${newMemory.originalName} (${type})`,
      getIp(req)
    );

    res.json(newMemory);
  }
);

// Update memory (e.g. change album, etc.)
app.put('/api/memories/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const memory = DB.getMemoryById(req.params.id);
    if (!memory) {
      res.status(404).json({ error: 'Memory not found.' });
      return;
    }
    const { albumId, isApproved } = req.body;
    const updates: Partial<Memory> = {};
    if (albumId !== undefined) {
      updates.albumId = albumId === '' ? null : albumId;
    }
    if (isApproved !== undefined) {
      updates.isApproved = !!isApproved;
    }
    const updated = DB.updateMemory(req.params.id, updates);
    DB.logActivity(
      req.user!.id,
      req.user!.username,
      'MEMORY_UPDATE',
      `Reassigned album for: ${memory.originalName}`,
      getIp(req)
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete memory
app.delete('/api/memories/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const memory = DB.getMemoryById(req.params.id);
  if (!memory) {
    res.status(404).json({ error: 'Memory not found.' });
    return;
  }

  // Allow uploader or admin to delete
  if (req.user!.role !== 'admin' && memory.uploaderId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to delete this memory.' });
    return;
  }

  DB.deleteMemory(req.params.id);
  DB.logActivity(
    req.user!.id,
    req.user!.username,
    'DELETE_UPLOAD',
    `Deleted file memory: ${memory.originalName}`,
    getIp(req)
  );

  res.json({ message: 'Memory successfully deleted.' });
});

// Like / Unlike memory
app.post('/api/memories/:id/like', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const memory = DB.getMemoryById(req.params.id);
  if (!memory) {
    res.status(404).json({ error: 'Memory not found.' });
    return;
  }

  const userId = req.user!.id;
  let likes = [...memory.likes];
  const isLiking = !likes.includes(userId);

  if (isLiking) {
    likes.push(userId);
    // Create notification for uploader
    if (memory.uploaderId !== userId) {
      DB.createNotification({
        id: Math.random().toString(36).substring(2, 11),
        userId: memory.uploaderId,
        text: `${req.user!.username} liked your memory "${memory.originalName}".`,
        type: 'like',
        targetId: memory.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } else {
    likes = likes.filter((id) => id !== userId);
  }

  const updated = DB.updateMemory(memory.id, { likes });
  res.json(updated);
});

// Get Comments
app.get('/api/memories/:id/comments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const comments = DB.getComments(req.params.id);
  res.json(comments);
});

// Add Comment
app.post('/api/memories/:id/comments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const memory = DB.getMemoryById(req.params.id);
  if (!memory) {
    res.status(404).json({ error: 'Memory not found.' });
    return;
  }

  const { text } = req.body;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'Comment text cannot be empty.' });
    return;
  }

  const user = DB.getUserById(req.user!.id);
  const comment: Comment = {
    id: Math.random().toString(36).substring(2, 11),
    memoryId: memory.id,
    userId: req.user!.id,
    username: user?.displayName || req.user!.username,
    userAvatar: user?.avatarUrl || null,
    text,
    createdAt: new Date().toISOString(),
  };

  DB.addComment(comment);

  // Notify memory owner
  if (memory.uploaderId !== req.user!.id) {
    DB.createNotification({
      id: Math.random().toString(36).substring(2, 11),
      userId: memory.uploaderId,
      text: `${req.user!.username} commented: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`,
      type: 'comment',
      targetId: memory.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  res.json(comment);
});

// Delete Comment
app.delete('/api/memories/:id/comments/:commentId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const comments = DB.getComments(req.params.id);
  const comment = comments.find((c) => c.id === req.params.commentId);

  if (!comment) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }

  // Only author or admin can delete
  if (req.user!.role !== 'admin' && comment.userId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  DB.deleteComment(req.params.commentId);
  res.json({ message: 'Comment successfully deleted.' });
});

// Moderation: Approve memory
app.put('/api/memories/:id/approve', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const memory = DB.getMemoryById(req.params.id);
  if (!memory) {
    res.status(404).json({ error: 'Memory not found.' });
    return;
  }

  const { approve } = req.body;
  const updated = DB.updateMemory(memory.id, { isApproved: !!approve });

  if (approve) {
    // Notify uploader their memory was approved
    DB.createNotification({
      id: Math.random().toString(36).substring(2, 11),
      userId: memory.uploaderId,
      text: `Your memory upload "${memory.originalName}" has been approved and is now visible in the wedding gallery!`,
      type: 'announcement',
      targetId: memory.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  DB.logActivity(
    req.user!.id,
    req.user!.username,
    'MODERATE',
    `${approve ? 'Approved' : 'Disapproved'} guest memory: ${memory.originalName}`,
    getIp(req)
  );

  res.json(updated);
});

// --- Download File ---
app.get('/api/memories/:id/download', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const memory = DB.getMemoryById(req.params.id);
  if (!memory) {
    res.status(404).json({ error: 'Memory not found.' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, memory.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Physical media file not found on disk.' });
    return;
  }

  DB.logActivity(
    req.user!.id,
    req.user!.username,
    'DOWNLOAD',
    `Downloaded original high quality: ${memory.originalName}`,
    getIp(req)
  );

  res.download(filePath, memory.originalName);
});

// --- User Notifications Endpoints ---
app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = DB.getNotifications(req.user!.id);
  res.json(list);
});

app.post('/api/notifications/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  DB.markNotificationsRead(req.user!.id);
  res.json({ message: 'Notifications marked as read.' });
});

// --- Admin Dashboard & Manage Users Endpoints ---

// Stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const memories = DB.getMemories();
  const users = DB.getUsers();

  const totalFiles = memories.length;
  const totalImages = memories.filter((m) => m.type === 'image').length;
  const totalVideos = memories.filter((m) => m.type === 'video').length;

  let totalBytesUsed = 0;
  memories.forEach((m) => {
    totalBytesUsed += m.size;
  });

  // Calculate stats by uploader
  const userStats = users.map((u) => {
    const userMemories = memories.filter((m) => m.uploaderId === u.id);
    return {
      userId: u.id,
      displayName: u.displayName,
      username: u.username,
      uploadCount: userMemories.length,
      likesReceived: userMemories.reduce((acc, m) => acc + m.likes.length, 0),
    };
  }).sort((a, b) => b.uploadCount - a.uploadCount);

  // Daily uploads trend (last 7 days)
  const dailyUploads: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyUploads[dateStr] = 0;
  }

  memories.forEach((m) => {
    const dateStr = m.uploadDate.split('T')[0];
    if (dateStr in dailyUploads) {
      dailyUploads[dateStr]++;
    }
  });

  const uploadTrend = Object.entries(dailyUploads).map(([date, count]) => ({
    date,
    count,
  }));

  // Server health status (real node statistics)
  const heapUsedMB = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
  const freeMemory = Math.max(0, 512 - heapUsedMB);
  const totalMemory = 512;

  res.json({
    totalFiles,
    totalImages,
    totalVideos,
    totalBytesUsed,
    userStats,
    uploadTrend,
    health: {
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      memoryUsed: `${Math.round(process.memoryUsage().heapUsed / (1024 * 1024))} MB`,
      memoryAvailable: `${freeMemory} / ${totalMemory} MB`,
    },
  });
});

// Logs
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const logs = DB.getActivityLogs();
  // Sort logs in reverse order
  res.json([...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
});

// User accounts list
app.get('/api/admin/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const users = DB.getUsers();
  // Exclude password hashes in response
  const sanitized = users.map(({ passwordHash, ...u }) => u);
  res.json(sanitized);
});

// Create new user account
app.post('/api/admin/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { username, password, displayName, role } = req.body;
  if (!username || !password || !displayName) {
    res.status(400).json({ error: 'Username, password, and display name are required.' });
    return;
  }

  const existing = DB.getUserByUsername(username);
  if (existing) {
    res.status(400).json({ error: 'An account with this username already exists.' });
    return;
  }

  const newUser: User = {
    id: 'user-' + Math.random().toString(36).substring(2, 11),
    username,
    passwordHash: bcryptjs.hashSync(password, 10),
    displayName,
    avatarUrl: null,
    role: role === 'admin' ? 'admin' : 'user',
    isActive: true,
    joinDate: new Date().toISOString(),
  };

  DB.createUser(newUser);
  DB.logActivity(req.user!.id, req.user!.username, 'USER_CREATE', `Created new guest user: ${username}`, getIp(req));

  const { passwordHash, ...sanitized } = newUser;
  res.json(sanitized);
});

// Update/Reset User Status or Password
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { isActive, password, role, displayName, allowedAlbumIds } = req.body;
  const targetUser = DB.getUserById(req.params.id);

  if (!targetUser) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  // Prevent disabling self
  if (req.params.id === req.user!.id && isActive === false) {
    res.status(400).json({ error: 'You cannot disable your own administrator account.' });
    return;
  }

  const updates: Partial<User> = {};
  if (isActive !== undefined) updates.isActive = !!isActive;
  if (role !== undefined) updates.role = role === 'admin' ? 'admin' : 'user';
  if (displayName !== undefined) updates.displayName = displayName;
  if (allowedAlbumIds !== undefined) updates.allowedAlbumIds = allowedAlbumIds;
  if (password && password.trim() !== '') {
    updates.passwordHash = bcryptjs.hashSync(password, 10);
  }

  const updatedUser = DB.updateUser(req.params.id, updates);
  DB.logActivity(
    req.user!.id,
    req.user!.username,
    'USER_UPDATE',
    `Modified account details for user: ${targetUser.username}`,
    getIp(req)
  );

  const { passwordHash, ...sanitized } = updatedUser;
  res.json(sanitized);
});

// Delete user account
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const targetUser = DB.getUserById(req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    return;
  }

  DB.deleteUser(req.params.id);
  DB.logActivity(
    req.user!.id,
    req.user!.username,
    'USER_DELETE',
    `Permanently deleted user account: ${targetUser.username}`,
    getIp(req)
  );

  res.json({ message: 'User account successfully deleted.' });
});

// -------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION SERVING
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Wedding Memories Full Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
