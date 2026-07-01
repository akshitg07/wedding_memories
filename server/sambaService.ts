/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import SMB2 from 'smb2';
import { DB } from './db';
import { Memory, Album, SambaSettings } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const LOG_FILE = path.join(DATA_DIR, 'samba_sync.log');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Custom log helper
export function logSync(message: string, isNewRun = false) {
  const timestamp = new Date().toISOString().substring(11, 19);
  const logMessage = `[${timestamp}] ${message}\n`;
  if (isNewRun) {
    fs.writeFileSync(LOG_FILE, `=== Sync Started at ${new Date().toLocaleString()} ===\n${logMessage}`, 'utf-8');
  } else {
    fs.appendFileSync(LOG_FILE, logMessage, 'utf-8');
  }
  console.log(`[SambaSync] ${message}`);
}

// Retrieve last sync logs (up to 200 lines)
export function getSyncLogs(): string {
  if (!fs.existsSync(LOG_FILE)) {
    return 'No sync runs recorded yet.';
  }
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return content;
  } catch (err: any) {
    return `Error reading logs: ${err.message}`;
  }
}

// Main background sync executor
export async function runSambaSync(): Promise<void> {
  const settings = DB.getSettings();
  const config = settings.samba;

  if (!config || !config.enabled) {
    logSync('Sync is currently disabled or unconfigured in site settings.', true);
    return;
  }

  // Set state to syncing
  config.syncStatus = 'syncing';
  config.syncMessage = 'Scanning files...';
  DB.updateSettings({ samba: config });

  logSync(`Initializing sync run for type: ${config.type}`, true);

  try {
    let filesSyncedCount = 0;
    let albumsCreatedCount = 0;
    let filesSkippedCount = 0;

    // Cache existing synced memories to perform O(1) duplicate checks and skip redundant network calls
    const initialMemories = DB.getMemories();
    const syncedSet = new Set(
      initialMemories.map((m) => `${m.albumId || 'root'}::${m.originalName}`)
    );

    // Dynamic helper for pure async concurrency pooling
    const runConcurrent = async <T>(items: T[], fn: (item: T) => Promise<void>, limit: number) => {
      const executing = new Set<Promise<any>>();
      for (const item of items) {
        const p = Promise.resolve().then(() => fn(item));
        executing.add(p);
        p.then(() => executing.delete(p));
        if (executing.size >= limit) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);
    };

    // Helper to create an album if it doesn't exist
    const createAlbumIfNeeded = async (albumName: string, parentId: string | null): Promise<string> => {
      const albums = DB.getAlbums();
      // Generate unique ID based on name and parent to avoid collisions
      const normalizedName = albumName.trim();
      const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const albumId = parentId ? `${parentId}-${slug}` : slug;

      const existing = albums.find((a) => a.id === albumId);
      if (existing) {
        return existing.id;
      }

      logSync(`Creating Album: "${normalizedName}" (id: ${albumId}, parent: ${parentId || 'Root'})`);
      const newAlbum: Album = {
        id: albumId,
        name: normalizedName,
        description: `Imported folder structure for ${normalizedName}.`,
        coverUrl: null,
        createdAt: new Date().toISOString(),
        parentId,
      };

      DB.createAlbum(newAlbum);
      albumsCreatedCount++;
      return albumId;
    };

    // Helper when a media file is discovered
    const onFileFound = async (filePathOrBuffer: string | Buffer, filename: string, albumId: string | null, size: number, isDirectSmb = false, clientInstance?: any) => {
      const memories = DB.getMemories();

      // Avoid duplicates
      const isDuplicate = memories.some(
        (m) => m.originalName === filename && m.size === size && m.albumId === albumId
      );

      if (isDuplicate) {
        filesSkippedCount++;
        return;
      }

      logSync(`Syncing new file: "${filename}" (${(size / (1024 * 1024)).toFixed(2)} MB)...`);

      // Generate a unique safe filename on local storage
      const ext = path.extname(filename).toLowerCase();
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const localFilename = `samba-${uniqueSuffix}${ext}`;
      const localAbsolutePath = path.join(UPLOADS_DIR, localFilename);

      // Save/copy the file to the local storage
      if (isDirectSmb && clientInstance) {
        // Direct SMB read
        await new Promise<void>((resolve, reject) => {
          clientInstance.readFile(filePathOrBuffer as string, (err: any, data: Buffer) => {
            if (err) {
              return reject(new Error(`Failed to read file from SMB: ${err.message}`));
            }
            try {
              fs.writeFileSync(localAbsolutePath, data);
              resolve();
            } catch (fsErr: any) {
              reject(fsErr);
            }
          });
        });
      } else {
        // Local path copy
        fs.copyFileSync(filePathOrBuffer as string, localAbsolutePath);
      }

      // Detect Media Type
      const isVideo = ['.mp4', '.mov', '.mkv', '.avi'].includes(ext);
      const type = isVideo ? 'video' : 'image';
      const mimeType = isVideo ? 'video/mp4' : `image/${ext.replace('.', '') || 'jpeg'}`;

      // Insert memory record
      const newMemory: Memory = {
        id: 'samba-' + Math.random().toString(36).substring(2, 11),
        uploaderId: 'admin-uuid',
        uploaderName: 'Samba Sync',
        uploaderAvatar: null,
        filename: localFilename,
        originalName: filename,
        mimeType,
        type,
        size,
        uploadDate: new Date().toISOString(),
        albumId,
        likes: [],
        metadata: {
          cameraModel: 'Samba Server',
        },
        isApproved: true, // Automatically approved
      };

      DB.createMemory(newMemory);
      filesSyncedCount++;
    };

    if (config.type === 'mount') {
      // -----------------------------------------------------------------
      // METHOD A: Local Mount Path recursion
      // -----------------------------------------------------------------
      const rootDir = config.mountPath;
      if (!fs.existsSync(rootDir)) {
        throw new Error(`Local mount path does not exist: "${rootDir}". Please verify it is mounted correctly.`);
      }

      logSync(`Scanning local mount path: ${rootDir}`);

      const scanLocal = async (relativeDir: string, parentAlbumId: string | null) => {
        const absolutePath = relativeDir ? path.join(rootDir, relativeDir) : rootDir;
        const items = fs.readdirSync(absolutePath);

        for (const item of items) {
          if (item.startsWith('.')) continue;

          const relativeItemPath = relativeDir ? path.join(relativeDir, item) : item;
          const absoluteItemPath = path.join(rootDir, relativeItemPath);
          const stat = fs.statSync(absoluteItemPath);

          if (stat.isDirectory()) {
            const nestedAlbumId = await createAlbumIfNeeded(item, parentAlbumId);
            await scanLocal(relativeItemPath, nestedAlbumId);
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            const isMedia = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.mkv', '.avi'].includes(ext);
            if (isMedia) {
              await onFileFound(absoluteItemPath, item, parentAlbumId, stat.size, false);
            }
          }
        }
      };

      await scanLocal('', null);

    } else if (config.type === 'direct') {
      // -----------------------------------------------------------------
      // METHOD B: Direct network Samba using 'smb2' client library
      // -----------------------------------------------------------------
      if (!config.smbHost || !config.smbShare) {
        throw new Error('Samba Host and Share Name are required for direct connection.');
      }

      // Prepare Windows backslash share format: \\host\share
      const cleanedHost = config.smbHost.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
      const cleanedShare = config.smbShare.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
      const sharePath = `\\\\${cleanedHost}\\${cleanedShare}`;

      logSync(`Connecting to Samba Network Share: ${sharePath} (User: ${config.smbUser || 'guest'})`);

      const smbClient = new SMB2({
        share: sharePath,
        domain: config.smbDomain || 'WORKGROUP',
        username: config.smbUser || 'guest',
        password: config.smbPass || '',
      });

      // Scan remote Samba directories recursively
      const scanSmb = async (remoteDir: string, parentAlbumId: string | null) => {
        return new Promise<void>((resolve, reject) => {
          smbClient.readdir(remoteDir, async (err: any, files: string[]) => {
            if (err) {
              return reject(new Error(`Failed to list directory "${remoteDir}": ${err.message}`));
            }

            try {
              const validFiles = files.filter(f => !f.startsWith('.'));

              await runConcurrent(validFiles, async (file) => {
                const remoteFilePath = remoteDir ? `${remoteDir}\\${file}` : file;
                const ext = path.extname(file).toLowerCase();
                const isMedia = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.mkv', '.avi'].includes(ext);

                if (isMedia) {
                  // O(1) check using our cached set
                  const key = `${parentAlbumId || 'root'}::${file}`;
                  if (syncedSet.has(key)) {
                    filesSkippedCount++;
                    return;
                  }

                  // Only call getSize if it is not a known duplicate!
                  const bytes = await new Promise<number>((res) => {
                    smbClient.getSize(remoteFilePath, (sizeErr: any, sizeVal: number) => {
                      res(sizeErr ? 0 : sizeVal);
                    });
                  });

                  await onFileFound(remoteFilePath, file, parentAlbumId, bytes, true, smbClient);
                  syncedSet.add(key); // Register in local set
                } else {
                  // Skip checking standard non-media file extensions to avoid unnecessary network round-trips
                  const isCommonNonMedia = ['.txt', '.pdf', '.docx', '.xlsx', '.zip', '.rar', '.db', '.ini', '.DS_Store'].includes(ext);
                  if (isCommonNonMedia) {
                    return;
                  }

                  // Check if it is a directory by trying readdir
                  const isDir = await new Promise<boolean>((res) => {
                    smbClient.readdir(remoteFilePath, (dirErr: any) => {
                      res(!dirErr);
                    });
                  });

                  if (isDir) {
                    const nestedAlbumId = await createAlbumIfNeeded(file, parentAlbumId);
                    await scanSmb(remoteFilePath, nestedAlbumId);
                  }
                }
              }, 5); // Process up to 5 files concurrently to speed up network roundtrips safely

              resolve();
            } catch (innerErr) {
              reject(innerErr);
            }
          });
        });
      };

      const remoteRoot = config.remoteFolder ? config.remoteFolder.replace(/\//g, '\\') : '';
      await scanSmb(remoteRoot, null);
    }

    // Success update
    logSync(`Sync complete! Created ${albumsCreatedCount} albums, Synced ${filesSyncedCount} new files, Skipped ${filesSkippedCount} duplicate files.`);
    
    config.syncStatus = 'success';
    config.lastSyncTime = new Date().toISOString();
    config.syncMessage = `Success! Synced ${filesSyncedCount} files. Created ${albumsCreatedCount} albums.`;
    DB.updateSettings({ samba: config });

    // Log to activity log
    DB.logActivity(
      null,
      'System',
      'SAMBA_SYNC_SUCCESS',
      `Samba Sync completed. Synced ${filesSyncedCount} new files, created ${albumsCreatedCount} folders.`
    );

  } catch (error: any) {
    logSync(`Sync Error: ${error.message}`);
    config.syncStatus = 'error';
    config.syncMessage = `Error: ${error.message}`;
    DB.updateSettings({ samba: config });

    DB.logActivity(
      null,
      'System',
      'SAMBA_SYNC_FAILED',
      `Samba Sync failed: ${error.message}`
    );
  }
}
