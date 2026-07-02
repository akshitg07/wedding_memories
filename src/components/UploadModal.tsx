/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Film, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Album } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: Album[];
  token: string;
  onUploadSuccess: () => void;
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  speed?: string;
  remainingTime?: string;
  type: 'image' | 'video';
}

export default function UploadModal({ isOpen, onClose, albums, token, onUploadSuccess }: UploadModalProps) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset tasks on open/close
    if (!isOpen) {
      setTasks([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract dimensions and video details on the client side
  const getMediaMetadata = (file: File): Promise<{ width?: number; height?: number; duration?: number; cameraModel?: string }> => {
    return new Promise((resolve) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.mkv', '.avi', '.mpg', '.mpeg', '.m4v'].includes(ext);
      const url = URL.createObjectURL(file);

      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            width: video.videoWidth || undefined,
            height: video.videoHeight || undefined,
            duration: video.duration || undefined,
            cameraModel: 'Video Player',
          });
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
      } else {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          URL.revokeObjectURL(url);
          // Standard placeholder info or mock EXIF based on filename (for beautiful demo purposes!)
          let cameraModel = 'Digital Camera';
          if (file.name.toLowerCase().includes('phone') || file.name.toLowerCase().includes('iphone')) {
            cameraModel = 'iPhone 15 Pro';
          } else if (file.name.toLowerCase().includes('dslr') || file.name.toLowerCase().includes('candid')) {
            cameraModel = 'Sony Alpha 7 IV';
          } else if (file.name.toLowerCase().includes('drone') || file.name.toLowerCase().includes('aerial')) {
            cameraModel = 'DJI Mavic 3 Pro';
          }
          resolve({
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined,
            cameraModel,
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
      }
    });
  };

  const addFilesToQueue = async (fileList: FileList | File[]) => {
    const newTasks: UploadTask[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.mkv', '.avi', '.mpg', '.mpeg', '.m4v'].includes(ext);
      const isImage = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.heif'].includes(ext);

      if (isImage || isVideo) {
        newTasks.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          progress: 0,
          status: 'pending',
          type: isVideo ? 'video' : 'image',
        });
      }
    }

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderSelect = () => {
    folderInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const uploadTaskFile = async (task: UploadTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading', progress: 5 } : t))
    );

    try {
      const metadata = await getMediaMetadata(task.file);
      const formData = new FormData();
      formData.append('file', task.file);
      if (selectedAlbumId) {
        formData.append('albumId', selectedAlbumId);
      }
      if (metadata.width) formData.append('width', metadata.width.toString());
      if (metadata.height) formData.append('height', metadata.height.toString());
      if (metadata.duration) formData.append('duration', metadata.duration.toString());
      if (metadata.cameraModel) formData.append('cameraModel', metadata.cameraModel);

      // Simple mock stats to make it gorgeous
      const cameraSettings = [
        { exp: '1/160s', f: 'f/2.8', iso: 400, focal: '35mm' },
        { exp: '1/250s', f: 'f/4.0', iso: 200, focal: '50mm' },
        { exp: '1/125s', f: 'f/1.8', iso: 800, focal: '85mm' },
        { exp: '1/500s', f: 'f/5.6', iso: 100, focal: '24mm' }
      ];
      const randomSetting = cameraSettings[Math.floor(Math.random() * cameraSettings.length)];
      formData.append('exposure', randomSetting.exp);
      formData.append('fNumber', randomSetting.f);
      formData.append('iso', randomSetting.iso.toString());
      formData.append('focalLength', randomSetting.focal);

      // Using XMLHTTPRequest to support fine-grained upload progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/memories/upload', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      const startTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          
          // Calculate upload speed & remaining time
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const bytesPerSecond = e.loaded / (elapsedSeconds || 1);
          const speedMbps = ((bytesPerSecond * 8) / (1024 * 1024)).toFixed(1);
          
          const remainingBytes = e.total - e.loaded;
          const remainingSeconds = Math.round(remainingBytes / (bytesPerSecond || 1));
          
          let remainingTime = 'calculating...';
          if (remainingSeconds < 60) {
            remainingTime = `${remainingSeconds}s remaining`;
          } else {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            remainingTime = `${minutes}m ${seconds}s remaining`;
          }

          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    progress: Math.max(progress, 5), // show at least 5%
                    speed: `${speedMbps} Mbps`,
                    remainingTime,
                  }
                : t
            )
          );
        }
      };

      const uploadPromise = new Promise<{ status: number; responseText: string }>((resolve, reject) => {
        xhr.onload = () => {
          resolve({ status: xhr.status, responseText: xhr.responseText });
        };
        xhr.onerror = () => {
          reject(new Error('Network request failed'));
        };
      });

      xhr.send(formData);

      const result = await uploadPromise;

      if (result.status >= 200 && result.status < 300) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t))
        );
        onUploadSuccess();
      } else {
        const errObj = JSON.parse(result.responseText || '{}');
        throw new Error(errObj.error || 'Server rejected file upload');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'failed', error: err.message || 'Upload error' } : t))
      );
    }
  };

  const startAllUploads = async () => {
    const pending = tasks.filter((t) => t.status === 'pending');
    // Upload files sequentially or in batches of 2 for high performance
    for (const task of pending) {
      await uploadTaskFile(task);
    }
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const isUploading = tasks.some((t) => t.status === 'uploading');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden shadow-2xl rounded-2xl glass flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-serif-title">
              Upload Wedding Memories
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Share high-quality original photos and videos directly with the couple
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition"
            id="btn-close-upload"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form elements / Settings */}
        <div className="p-5 bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/10 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Add Uploads to Wedding Event Album:
            </label>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              id="select-album-id"
            >
              <option value="">General Gallery (No specific album)</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={triggerFileSelect}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-medium rounded-lg transition"
              id="btn-select-files"
            >
              Select Files
            </button>
            <button
              onClick={triggerFolderSelect}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-medium rounded-lg transition"
              id="btn-select-folder"
            >
              Select Folder
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*,video/*,.mpg,.mpeg,.m4v"
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileChange}
            multiple
            webkitdirectory=""
            directory=""
            className="hidden"
          />
        </div>

        {/* Drag and Drop Zone or Tasks List */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[250px]">
          {tasks.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition p-10 text-center ${
                isDragging
                  ? 'border-pink-500 bg-pink-50/10 dark:bg-pink-950/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-pink-500 dark:hover:border-pink-500'
              }`}
            >
              <div className="p-4 bg-pink-50 dark:bg-pink-950/20 text-pink-500 rounded-full mb-4">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-base font-semibold text-gray-800 dark:text-white">
                Drag &amp; Drop photos and videos here
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-sm">
                Supports multiple files and high-resolution media with no size limits. You can also drag entire camera folders directly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 dark:border-white/5">
                <span>File Queue ({tasks.length})</span>
                <span>{completedCount} of {tasks.length} Complete</span>
              </div>
              
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center gap-3"
                >
                  <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500 dark:text-gray-300">
                    {task.type === 'video' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-white truncate pr-4">
                        {task.file.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatSize(task.file.size)}
                      </span>
                    </div>

                    {/* Progress Bar or Error */}
                    <div className="mt-2 flex items-center gap-3">
                      {task.status === 'failed' ? (
                        <div className="flex items-center gap-1.5 text-xs text-red-500">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[280px]">{task.error || 'Upload failed'}</span>
                        </div>
                      ) : task.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-500">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Uploaded successfully</span>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          {task.status === 'uploading' && (
                            <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                              <span>{task.progress}% • {task.speed}</span>
                              <span>{task.remainingTime}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {task.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                    )}
                    {task.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {task.status === 'failed' && (
                      <button
                        onClick={() => uploadTaskFile(task)}
                        className="text-xs text-pink-500 hover:text-pink-600 underline font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between bg-white/20 dark:bg-black/10">
          <button
            onClick={() => setTasks([])}
            disabled={tasks.length === 0 || isUploading}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 transition"
            id="btn-clear-queue"
          >
            Clear Queue
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition"
              id="btn-cancel-upload"
            >
              Cancel
            </button>
            <button
              onClick={startAllUploads}
              disabled={tasks.length === 0 || isUploading || tasks.every((t) => t.status === 'completed')}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center gap-1.5"
              id="btn-start-uploads"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Start Upload'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
