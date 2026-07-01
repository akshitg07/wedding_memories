/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Calendar, BookOpen, Layers, ChevronRight } from 'lucide-react';
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
    switch (albumId) {
      case 'haldi':
        return 'https://images.unsplash.com/photo-1615887023516-9b6bcd559e87?w=400&q=80'; // Bright marigold yellow vibes
      case 'mehendi':
        return 'https://images.unsplash.com/photo-1590075865003-e48277adc558?w=400&q=80'; // Detailed henna hands
      case 'sangeet':
        return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80'; // Colorful party lighting
      case 'wedding':
        return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80'; // Sacred altar vows
      case 'reception':
        return 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=400&q=80'; // Dinner toasts and champagne
      case 'candid':
        return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80'; // Couples laughing
      default:
        return 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80'; // Wedding bands generic
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 animate-fade-in">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-rose-400" />
          <h3 className="text-xl font-medium text-white font-serif italic">
            Ceremonies &amp; Album Folders
          </h3>
        </div>
        
        {selectedAlbumId && (
          <button
            onClick={() => onSelectAlbum(null)}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
            id="btn-clear-album-filter"
          >
            Show All Memories
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 'All Memories' Virtual Folder */}
        <div
          onClick={() => onSelectAlbum(null)}
          className={`group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-sm border transition duration-300 ${
            selectedAlbumId === null
              ? 'ring-2 ring-rose-500 border-transparent scale-[1.02]'
              : 'border-white/10 hover:border-white/20 hover:scale-[1.01]'
          }`}
        >
          <img
            src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=300&q=80"
            className="w-full h-full object-cover transition group-hover:scale-105 filter saturate-50 brightness-75"
            alt="All Memories"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 flex flex-col justify-end p-3 text-white">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Total Album</span>
            <h4 className="font-semibold text-xs truncate">All Memories</h4>
            <span className="text-[10px] text-slate-300 font-mono mt-0.5">{memories.length} files total</span>
          </div>
        </div>

        {/* Dynamic Albums list */}
        {albums.map((album) => {
          const albumMemories = memories.filter((m) => m.albumId === album.id);
          
          // Cover logic: if album has memories, use first memory's url. Else fallback to aesthetic category photo.
          const coverImage = album.coverUrl 
            ? album.coverUrl 
            : albumMemories.length > 0 
            ? `/uploads/${albumMemories[0].filename}` 
            : getAlbumPlaceholderImage(album.id);

          const isSelected = selectedAlbumId === album.id;

          return (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album.id)}
              className={`group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-sm border transition duration-300 ${
                isSelected
                  ? 'ring-2 ring-rose-500 border-transparent scale-[1.02]'
                  : 'border-white/10 hover:border-white/20 hover:scale-[1.01]'
              }`}
            >
              <img
                src={coverImage}
                className="w-full h-full object-cover transition group-hover:scale-105 filter brightness-75"
                alt={album.name}
                onError={(e) => {
                  // Fallback if local file cover fails to load
                  e.currentTarget.src = getAlbumPlaceholderImage(album.id);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 flex flex-col justify-end p-3 text-white">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Wedding Folder</span>
                <h4 className="font-semibold text-xs truncate">{album.name}</h4>
                <span className="text-[10px] text-slate-300 font-mono mt-0.5">{albumMemories.length} files</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
