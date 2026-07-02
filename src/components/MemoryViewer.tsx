/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Download,
  Info,
  Calendar,
  User,
  Settings,
  Trash2,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Memory, Comment, User as UserType, Album } from '../types';

interface MemoryViewerProps {
  memory: Memory;
  allMemories: Memory[];
  user: UserType;
  token: string;
  onClose: () => void;
  onLikeToggle: (id: string) => void;
  onDeleteMemory?: (id: string) => void;
  albums?: Album[];
  onMemoryUpdate?: () => void;
}

export default function MemoryViewer({
  memory,
  allMemories,
  user,
  token,
  onClose,
  onLikeToggle,
  onDeleteMemory,
  albums = [],
  onMemoryUpdate,
}: MemoryViewerProps) {
  const [currentMemory, setCurrentMemory] = useState<Memory>(memory);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [showMetadata, setShowMetadata] = useState(true);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(4000); // 4s default
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentIndex = allMemories.findIndex((m) => m.id === currentMemory.id);

  // Load comments
  const loadComments = async (memId: string) => {
    try {
      const res = await fetch(`/api/memories/${memId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    loadComments(currentMemory.id);
  }, [currentMemory.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allMemories]);

  // Slideshow timer
  useEffect(() => {
    if (isPlayingSlideshow) {
      slideshowTimerRef.current = setTimeout(() => {
        handleNext();
      }, slideshowInterval);
    } else {
      if (slideshowTimerRef.current) {
        clearTimeout(slideshowTimerRef.current);
      }
    }

    return () => {
      if (slideshowTimerRef.current) {
        clearTimeout(slideshowTimerRef.current);
      }
    };
  }, [isPlayingSlideshow, currentMemory.id]);

  const handleNext = () => {
    if (allMemories.length <= 1) return;
    const nextIdx = (currentIndex + 1) % allMemories.length;
    setCurrentMemory(allMemories[nextIdx]);
  };

  const handlePrev = () => {
    if (allMemories.length <= 1) return;
    const prevIdx = (currentIndex - 1 + allMemories.length) % allMemories.length;
    setCurrentMemory(allMemories[prevIdx]);
  };

  const handleLike = () => {
    onLikeToggle(currentMemory.id);
    // Update local likes list on the fly for responsive UX
    const isLiking = !currentMemory.likes.includes(user.id);
    const updatedLikes = isLiking
      ? [...currentMemory.likes, user.id]
      : currentMemory.likes.filter((id) => id !== user.id);

    setCurrentMemory((prev) => ({ ...prev, likes: updatedLikes }));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await fetch(`/api/memories/${currentMemory.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newCommentText }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/memories/${currentMemory.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleDeleteMemoryCall = () => {
    if (window.confirm('Are you sure you want to permanently delete this memory from the gallery?')) {
      if (onDeleteMemory) {
        onDeleteMemory(currentMemory.id);
      }
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown Size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsVideoMuted(videoRef.current.muted);
    }
  };

  const hasLiked = currentMemory.likes.includes(user.id);
  const mediaUrl = `/uploads/${currentMemory.filename}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black/95 backdrop-blur-md overflow-y-auto md:overflow-hidden animate-fade-in">
      
      {/* 1. MAIN DISPLAY AREA (LEFT) */}
      <div className="flex-1 relative flex flex-col justify-center items-center p-4 pt-20 md:pt-4 min-h-[75vh] md:min-h-0">
        
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 items-center justify-between">
          
          {/* Quick slideshow controls */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 text-white">
            <button
              onClick={() => setIsPlayingSlideshow(!isPlayingSlideshow)}
              className="hover:text-rose-400 transition flex items-center gap-1.5 text-xs font-semibold"
              id="btn-slideshow-toggle"
            >
              {isPlayingSlideshow ? (
                <>
                  <Pause className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="hidden sm:inline">Slideshow Active</span>
                  <span className="inline sm:hidden">Active</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Slideshow Mode</span>
                  <span className="inline sm:hidden">Slideshow</span>
                </>
              )}
            </button>
            {isPlayingSlideshow && (
              <select
                value={slideshowInterval}
                onChange={(e) => setSlideshowInterval(parseInt(e.target.value))}
                className="bg-transparent border-0 text-xs text-rose-400 focus:outline-none focus:ring-0 font-medium ml-1"
                id="select-slideshow-interval"
              >
                <option value="2000" className="bg-zinc-950">2s</option>
                <option value="4000" className="bg-zinc-950">4s</option>
                <option value="6000" className="bg-zinc-950">6s</option>
                <option value="8000" className="bg-zinc-950">8s</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2.5 rounded-full border transition ${
                showMetadata
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Toggle Info"
              id="btn-toggle-info"
            >
              <Info className="w-5 h-5" />
            </button>

            <a
              href={`/api/memories/${currentMemory.id}/download`}
              className="p-2.5 rounded-full bg-black/30 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Download Original"
              id="btn-download-original"
            >
              <Download className="w-5 h-5" />
            </a>

            {(user.role === 'admin' || currentMemory.uploaderId === user.id) && (
              <button
                onClick={handleDeleteMemoryCall}
                className="p-2.5 rounded-full bg-black/30 border border-red-950/25 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                title="Delete memory"
                id="btn-delete-memory"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/30 border border-white/15 text-white hover:bg-white/10 transition"
              id="btn-close-viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Button */}
        {allMemories.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all border border-white/5 hover:scale-105 z-10"
            id="btn-viewer-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Container */}
        <div className="w-full h-full max-h-[60vh] md:max-h-[80vh] flex items-center justify-center">
          {currentMemory.type === 'video' ? (
            <div className="relative max-w-full max-h-full group">
              <video
                ref={videoRef}
                src={mediaUrl}
                controls
                autoPlay
                muted={isVideoMuted}
                loop
                className="max-w-full max-h-[60vh] md:max-h-[80vh] rounded-xl object-contain shadow-2xl"
              />
              <button
                onClick={toggleMute}
                className="absolute bottom-16 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition border border-white/10 z-10"
                id="btn-video-mute-toggle"
              >
                {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt={currentMemory.originalName}
              className="max-w-full max-h-[60vh] md:max-h-[80vh] rounded-xl object-contain shadow-2xl select-none transition-transform duration-300 hover:scale-102"
              draggable="false"
            />
          )}
        </div>

        {/* Next Button */}
        {allMemories.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all border border-white/5 hover:scale-105 z-10"
            id="btn-viewer-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Footer info (Inside media area) */}
        <div className="absolute bottom-4 left-4 flex gap-4 items-center">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${
              hasLiked
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 scale-105'
                : 'bg-black/30 border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            id="btn-like-active"
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500 animate-pulse' : ''}`} />
            <span className="text-xs font-semibold">{currentMemory.likes.length} Likes</span>
          </button>

          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-full text-xs text-slate-300">
            {currentIndex + 1} of {allMemories.length}
          </div>
        </div>

      </div>

      {/* 2. COMMENTS & METADATA BAR (RIGHT) */}
      {showMetadata && (
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-zinc-950/95 backdrop-blur-md flex flex-col shrink-0 text-white animate-slide-in md:h-full">
          
          {/* Section: Upload Details */}
          <div className="p-5 border-b border-white/5 flex flex-col gap-4">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono">Uploaded By</span>
              <div className="flex items-center gap-2.5 mt-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center text-sm font-semibold uppercase text-black shadow-inner shrink-0">
                  {currentMemory.uploaderAvatar ? (
                    <img
                      src={currentMemory.uploaderAvatar}
                      alt={currentMemory.uploaderName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    currentMemory.uploaderName.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-100">{currentMemory.uploaderName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Wedding Guest</p>
                </div>
              </div>
            </div>

            {user.role === 'admin' && albums && albums.length > 0 && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                <label className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono block mb-1">
                  Folder / Album Assignment
                </label>
                <select
                  value={currentMemory.albumId || ''}
                  onChange={async (e) => {
                    const newId = e.target.value;
                    try {
                      const res = await fetch(`/api/memories/${currentMemory.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ albumId: newId }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setCurrentMemory(updated);
                        if (onMemoryUpdate) onMemoryUpdate();
                      } else {
                        const err = await res.json();
                        alert(err.error || 'Failed to reassign folder.');
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-rose-500/50 text-white cursor-pointer"
                >
                  <option value="">No Folder (Root Pool)</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[9px] uppercase font-semibold font-mono">Date Uploaded</span>
                </div>
                <p className="text-xs font-medium text-slate-200 mt-1">
                  {formatDate(currentMemory.uploadDate).split(' at ')[0]}
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Settings className="w-3.5 h-3.5" />
                  <span className="text-[9px] uppercase font-semibold font-mono">Media Details</span>
                </div>
                <p className="text-xs font-medium text-slate-200 mt-1 truncate font-mono">
                  {formatBytes(currentMemory.size)} • {currentMemory.type.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Camera EXIF / Technical Specs */}
          <div className="p-5 border-b border-white/5">
            <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono">Camera / Media Metadata</span>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[9px] text-slate-400 font-mono">Camera Model</span>
                <span className="font-semibold text-slate-200 truncate mt-0.5">
                  {currentMemory.metadata?.cameraModel || 'Phone/Generic'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[9px] text-slate-400 font-mono">Resolution</span>
                <span className="font-semibold text-slate-200 truncate mt-0.5 font-mono">
                  {currentMemory.metadata?.width && currentMemory.metadata?.height
                    ? `${currentMemory.metadata.width} × ${currentMemory.metadata.height}`
                    : 'Original Scale'}
                </span>
              </div>
              {currentMemory.metadata?.exposure && (
                <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[9px] text-slate-400 font-mono">Exposure</span>
                  <span className="font-semibold text-slate-200 font-mono mt-0.5">{currentMemory.metadata.exposure}</span>
                </div>
              )}
              {currentMemory.metadata?.fNumber && (
                <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[9px] text-slate-400 font-mono">Aperture</span>
                  <span className="font-semibold text-slate-200 font-mono mt-0.5">{currentMemory.metadata.fNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Comments Feed */}
          <div className="flex-1 md:overflow-y-auto p-5 flex flex-col min-h-0">
            <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono">Guest Comments ({comments.length})</span>
            
            {comments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-6">
                <MessageSquare className="w-8 h-8 opacity-30 mb-2 text-rose-400/80" />
                <p className="text-xs">No comments yet. Be the first to congratulate them!</p>
              </div>
            ) : (
              <div className="space-y-4 mt-3 flex-1 md:overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold uppercase shrink-0 text-rose-300">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt={comment.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        comment.username.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 bg-white/5 rounded-2xl p-3.5 border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">{comment.username}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          {(user.role === 'admin' || comment.userId === user.id) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-slate-400 hover:text-red-400 p-0.5 transition cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="p-4 border-t border-white/10 bg-zinc-950 flex gap-2">
            <input
              type="text"
              placeholder="Leave a lovely comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs focus:outline-none focus:border-rose-500/50 placeholder-slate-500 text-white"
              id="input-comment-text"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-slate-200 rounded-full transition cursor-pointer"
              id="btn-comment-submit"
            >
              Post
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
