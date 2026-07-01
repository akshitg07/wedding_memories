/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Image as ImageIcon,
  Film,
  Heart,
  Grid,
  Trash2,
  Download,
  CheckSquare,
  Square,
  PlayCircle,
  Clock,
  ThumbsUp,
  User,
  ExternalLink,
} from 'lucide-react';
import { Memory, Album, User as UserType } from '../types';

interface TimelineGalleryProps {
  memories: Memory[];
  albums: Album[];
  user: UserType;
  token: string;
  onMemoryClick: (memory: Memory) => void;
  onLikeToggle: (id: string) => void;
  onDeleteMemory: (id: string) => void;
  selectedAlbumId: string | null;
  onSelectAlbum: (id: string | null) => void;
  onRefreshMemories: () => void;
}

export default function TimelineGallery({
  memories,
  albums,
  user,
  token,
  onMemoryClick,
  onLikeToggle,
  onDeleteMemory,
  selectedAlbumId,
  onSelectAlbum,
  onRefreshMemories,
}: TimelineGalleryProps) {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
  
  // Selection Mode states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination / Lazy rendering limit
  const [renderLimit, setRenderLimit] = useState(12);

  // Filter & sort memories locally for immediate, high-fidelity UI feedback
  let filtered = [...memories];

  // 1. Filter by Album (if selected)
  if (selectedAlbumId) {
    filtered = filtered.filter((m) => m.albumId === selectedAlbumId);
  }

  // 2. Filter by media type
  if (mediaType !== 'all') {
    filtered = filtered.filter((m) => m.type === mediaType);
  }

  // 3. Filter by search query (checks title, creator, EXIF details)
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.originalName.toLowerCase().includes(q) ||
        m.uploaderName.toLowerCase().includes(q) ||
        m.metadata?.cameraModel?.toLowerCase().includes(q)
    );
  }

  // 4. Sort memories
  if (sortOrder === 'oldest') {
    filtered.sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
  } else if (sortOrder === 'popular') {
    filtered.sort((a, b) => b.likes.length - a.likes.length);
  } else {
    // default: newest
    filtered.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }

  // Slice based on render limit (Lazy loading/Pagination)
  const visibleMemories = filtered.slice(0, renderLimit);
  const hasMore = filtered.length > renderLimit;

  // Selection handlers
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering full screen modal
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((m) => m.id));
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  // Bulk sequential download (High performance client-side ZIP substitute)
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    
    // Download selected memories sequentially using trigger downloads
    for (const id of selectedIds) {
      const memory = memories.find((m) => m.id === id);
      if (memory) {
        const link = document.createElement('a');
        link.href = `/api/memories/${id}/download`;
        link.download = memory.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Micro-timeout to prevent browser from blocking concurrent file downloads
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (
      window.confirm(`Are you absolutely sure you want to permanently delete these ${count} files from the wedding gallery?`)
    ) {
      for (const id of selectedIds) {
        try {
          await fetch(`/api/memories/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.error(`Failed to delete memory: ${id}`, err);
        }
      }
      exitSelectMode();
      onRefreshMemories();
    }
  };

  const loadMore = () => {
    setRenderLimit((prev) => prev + 12);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      
      {/* 1. FILTER & CONTROLS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 mb-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search memories, guests, camera model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-500"
            id="input-gallery-search"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Media Type Filter */}
          <div className="flex border border-white/10 rounded-full overflow-hidden p-0.5 bg-white/5">
            <button
              onClick={() => setMediaType('all')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition ${
                mediaType === 'all'
                  ? 'bg-white text-black'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
              id="btn-media-filter-all"
            >
              All
            </button>
            <button
              onClick={() => setMediaType('image')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition flex items-center gap-1 ${
                mediaType === 'image'
                  ? 'bg-white text-black'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
              id="btn-media-filter-images"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Photos
            </button>
            <button
              onClick={() => setMediaType('video')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition flex items-center gap-1 ${
                mediaType === 'video'
                  ? 'bg-white text-black'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
              id="btn-media-filter-videos"
            >
              <Film className="w-3.5 h-3.5" />
              Videos
            </button>
          </div>

          {/* Sort selection */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3.5 py-2 text-xs font-semibold bg-white/5 border border-white/10 rounded-full text-white focus:outline-none focus:border-rose-500/50 cursor-pointer"
            id="select-sort-order"
          >
            <option value="newest" className="bg-zinc-950 text-white">Newest Uploads</option>
            <option value="oldest" className="bg-zinc-950 text-white">Oldest Uploads</option>
            <option value="popular" className="bg-zinc-950 text-white">Most Liked</option>
          </select>

          {/* Bulk Selection toggle button */}
          <button
            onClick={() => {
              if (isSelectMode) {
                exitSelectMode();
              } else {
                setIsSelectMode(true);
              }
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 ${
              isSelectMode
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            id="btn-select-mode-toggle"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {isSelectMode ? 'Cancel Select' : 'Bulk Select'}
          </button>
        </div>

      </div>

      {/* 2. BULK SELECTION TOP ACTION DRAWER */}
      {isSelectMode && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white flex items-center justify-between shadow-lg animate-slide-in border border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/35 rounded-full text-xs font-bold transition flex items-center gap-1"
              id="btn-select-all"
            >
              {selectedIds.length === filtered.length ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              {selectedIds.length === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-medium">{selectedIds.length} files selected for download/deletion</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-white text-black hover:bg-slate-200 disabled:opacity-50 font-semibold rounded-full text-xs shadow-md transition flex items-center gap-1.5"
              id="btn-bulk-download"
            >
              <Download className="w-3.5 h-3.5" />
              Download Selected
            </button>
            {(user.role === 'admin') && (
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/50 disabled:opacity-50 font-semibold rounded-full text-xs shadow-md transition flex items-center gap-1.5"
                id="btn-bulk-delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            )}
            <button
              onClick={exitSelectMode}
              className="px-3.5 py-2 text-white/80 hover:text-white font-semibold rounded-full text-xs"
              id="btn-exit-select"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. MASONRY PINTEREST-STYLE GALLERY GRID */}
      {visibleMemories.length === 0 ? (
        <div className="text-center py-24 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6">
          <Grid className="w-12 h-12 text-slate-600 mb-4 stroke-1 animate-pulse" />
          <h4 className="text-lg font-bold text-white">No Wedding Memories Found</h4>
          <p className="text-xs text-slate-400 mt-2 max-w-sm">
            Try resetting your active filters, or be the first guest to upload and contribute to this beautiful memory book!
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
          {visibleMemories.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            const coverUrl = `/uploads/${m.filename}`;

            return (
              <div
                key={m.id}
                onClick={() => {
                  if (isSelectMode) {
                    const e = {} as React.MouseEvent; // dummy event
                    e.stopPropagation = () => {};
                    handleToggleSelect(m.id, e);
                  } else {
                    onMemoryClick(m);
                  }
                }}
                className={`relative break-inside-avoid rounded-3xl overflow-hidden group transition-all duration-500 cursor-pointer bg-zinc-950/80 border ${
                  isSelected
                    ? 'ring-2 ring-rose-500 border-transparent scale-[0.98]'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Media Container */}
                <div className="relative overflow-hidden aspect-[3/4]">
                  {m.type === 'video' ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <video
                        src={coverUrl}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition" />
                      <div className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur rounded-lg text-white">
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center text-white/80 group-hover:text-white group-hover:scale-110 transition duration-300">
                        <PlayCircle className="w-12 h-12 stroke-1" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={coverUrl}
                        alt={m.originalName}
                        loading="lazy"
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 opacity-0 group-hover:opacity-100 transition duration-350" />
                    </>
                  )}

                  {/* Multi-Select Overlay Box */}
                  {isSelectMode && (
                    <button
                      onClick={(e) => handleToggleSelect(m.id, e)}
                      className="absolute top-3 left-3 p-1.5 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-rose-500 transition border border-white/10 z-10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4.5 h-4.5 text-rose-400" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-white/80" />
                      )}
                    </button>
                  )}
                </div>

                {/* Info Overlay (Visible on Hover for desktop, always for mobile) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 to-transparent text-white md:translate-y-2 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 font-mono">
                    {m.metadata?.cameraModel || 'Wedding Guest'}
                  </span>
                  <h4 className="font-semibold text-sm truncate text-white mt-0.5">{m.originalName}</h4>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-[9px] uppercase border border-rose-500/25">
                        {m.uploaderName.charAt(0)}
                      </div>
                      <span className="truncate max-w-[120px] font-medium text-slate-300">{m.uploaderName}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLikeToggle(m.id);
                      }}
                      className="flex items-center gap-1 text-slate-300 hover:text-rose-400 transition"
                      id={`btn-like-gallery-${m.id}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${m.likes.includes(user.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span className="font-mono">{m.likes.length}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. LAZY RENDER (LOAD MORE) BUTTON */}
      {hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs rounded-full shadow-lg transition flex items-center gap-1.5"
            id="btn-gallery-loadmore"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            Browse More Memories
          </button>
        </div>
      )}

    </div>
  );
}
