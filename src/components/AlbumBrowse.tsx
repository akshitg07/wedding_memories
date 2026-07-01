/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, ChevronRight, Folder, FolderUp, Home } from 'lucide-react';
import { Album, Memory } from '../types';

interface AlbumBrowseProps {
  albums: Album[];
  memories: Memory[];
  selectedAlbumId: string | null;
  onSelectAlbum: (id: string | null) => void;
}

export default function AlbumBrowse({ albums, memories, selectedAlbumId, onSelectAlbum }: AlbumBrowseProps) {
  
  // Custom styled placeholders for each standard album to look extremely premium!
  const getAlbumPlaceholderImage = (albumId: string) => {
    const cleanId = albumId.toLowerCase();
    if (cleanId.includes('haldi')) {
      return 'https://images.unsplash.com/photo-1615887023516-9b6bcd559e87?w=400&q=80';
    } else if (cleanId.includes('mehendi') || cleanId.includes('mehndi')) {
      return 'https://images.unsplash.com/photo-1590075865003-e48277adc558?w=400&q=80';
    } else if (cleanId.includes('sangeet')) {
      return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80';
    } else if (cleanId.includes('wedding') || cleanId.includes('shaadi')) {
      return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80';
    } else if (cleanId.includes('reception')) {
      return 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=400&q=80';
    } else if (cleanId.includes('candid')) {
      return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80';
  };

  // Find the active album
  const currentAlbum = selectedAlbumId ? albums.find((a) => a.id === selectedAlbumId) : null;

  // Build breadcrumbs: Root -> Parent(s) -> Selected Album
  const getBreadcrumbs = () => {
    if (!currentAlbum) return [];
    const crumbs: Album[] = [];
    let current: Album | undefined = currentAlbum;
    while (current) {
      crumbs.unshift(current);
      if (current.parentId) {
        current = albums.find((a) => a.id === current!.parentId);
      } else {
        current = undefined;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Filter albums to show in the folder navigation grid:
  // - If no album selected: show only root albums (where parentId is null, undefined, or empty)
  // - If an album is selected: show only albums whose parentId is the selected album ID
  const albumsToShow = selectedAlbumId
    ? albums.filter((a) => a.parentId === selectedAlbumId)
    : albums.filter((a) => !a.parentId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 animate-fade-in text-left">
      
      {/* Title & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-3 border-b border-white/5">
        
        {/* Dynamic Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-mono">
          <button
            onClick={() => onSelectAlbum(null)}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-rose-400" />
            <span>Memories</span>
          </button>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <button
                  onClick={() => onSelectAlbum(crumb.id)}
                  disabled={isLast}
                  className={`px-2 py-1 rounded-md transition ${
                    isLast
                      ? 'text-rose-400 font-semibold'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        
        {selectedAlbumId && (
          <button
            onClick={() => onSelectAlbum(null)}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition self-start md:self-auto cursor-pointer"
            id="btn-clear-album-filter"
          >
            Show All Memories
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 'All Memories' Virtual Folder or 'Go Up / Parent Folder' card */}
        {selectedAlbumId === null ? (
          <div
            onClick={() => onSelectAlbum(null)}
            className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-sm border transition duration-300 border-rose-500/40 ring-2 ring-rose-500/20 scale-[1.02]"
          >
            <img
              src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=300&q=80"
              className="w-full h-full object-cover transition group-hover:scale-105 filter saturate-50 brightness-75"
              alt="All Memories"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 flex flex-col justify-end p-3 text-white">
              <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono">Current Folder</span>
              <h4 className="font-semibold text-xs truncate">All Ceremonies</h4>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{memories.length} files total</span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onSelectAlbum(currentAlbum?.parentId || null)}
            className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-white/10 hover:border-rose-400/30 transition duration-300 bg-black/40 hover:bg-black/60 flex flex-col justify-center items-center text-center p-3 text-white"
          >
            <FolderUp className="w-7 h-7 text-rose-400 transition group-hover:scale-110 mb-1" />
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">Go Up</span>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-full">
              {currentAlbum?.parentId ? 'Parent Folder' : 'Home Directory'}
            </span>
          </div>
        )}

        {/* Dynamic nested folders list */}
        {albumsToShow.map((album) => {
          // Total memories in this folder recursively
          const getRecMemoriesCount = (albId: string): number => {
            const direct = memories.filter((m) => m.albumId === albId).length;
            const sub = albums.filter((a) => a.parentId === albId);
            return direct + sub.reduce((acc, current) => acc + getRecMemoriesCount(current.id), 0);
          };

          const albumMemories = memories.filter((m) => m.albumId === album.id);
          const totalRecursiveCount = getRecMemoriesCount(album.id);
          
          // Cover logic
          const coverImage = album.coverUrl 
            ? album.coverUrl 
            : albumMemories.length > 0 
            ? `/uploads/${albumMemories[0].filename}` 
            : getAlbumPlaceholderImage(album.id);

          return (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album.id)}
              className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-white/10 hover:border-white/20 hover:scale-[1.01] transition duration-300"
            >
              <img
                src={coverImage}
                className="w-full h-full object-cover transition group-hover:scale-105 filter brightness-[0.7] group-hover:brightness-[0.8]"
                alt={album.name}
                onError={(e) => {
                  e.currentTarget.src = getAlbumPlaceholderImage(album.id);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 flex flex-col justify-end p-3 text-white">
                <div className="flex items-center gap-1">
                  <Folder className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="text-[9px] uppercase font-bold tracking-widest text-rose-400 font-mono">Folder</span>
                </div>
                <h4 className="font-semibold text-xs truncate mt-0.5">{album.name}</h4>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {totalRecursiveCount} {totalRecursiveCount === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
