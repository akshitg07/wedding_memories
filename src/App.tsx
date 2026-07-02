/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Lock, User as UserIcon, Sparkles, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { User, Memory, Album, SiteSettings } from './types';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AlbumBrowse from './components/AlbumBrowse';
import TimelineGallery from './components/TimelineGallery';
import MemoryViewer from './components/MemoryViewer';
import UploadModal from './components/UploadModal';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';

export default function App() {
  // Session States
  const [token, setToken] = useState<string | null>(localStorage.getItem('wedding_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Gallery and DB States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'Our Wedding Memories',
    requireModeration: false,
    allowDownloads: true,
    primaryColor: '#db2777',
  });

  // Navigation states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Active Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);

  // Verify and bootstrap session
  const verifySession = async (userToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // Token expired or invalid
        handleLogout();
      }
    } catch (err) {
      console.error('Session verify failed:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (token) {
      verifySession(token);
    } else {
      setIsAuthenticating(false);
    }
  }, [token]);

  // Load database items once verified
  const loadDatabase = async () => {
    if (!token) return;
    try {
      // 1. Fetch settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSiteSettings(settingsData);
      }

      // 2. Fetch albums
      const albumsRes = await fetch('/api/albums', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (albumsRes.ok) {
        const albumsData = await albumsRes.json();
        setAlbums(albumsData);
      }

      // 3. Fetch memories
      const memoriesRes = await fetch('/api/memories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (memoriesRes.ok) {
        const memoriesData = await memoriesRes.json();
        setMemories(memoriesData);
      }
    } catch (err) {
      console.error('Failed to bootstrap wedding resources:', err);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadDatabase();
    }
  }, [user, token]);

  // Synchronize browser tab name with wedding site name settings
  useEffect(() => {
    if (siteSettings?.siteName) {
      document.title = siteSettings.siteName;
    } else {
      document.title = 'Akshit & Disha Wedding';
    }
  }, [siteSettings?.siteName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('wedding_token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Incorrect username or password.');
      }
    } catch (err) {
      setLoginError('Network issue connecting to wedding server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wedding_token');
    setToken(null);
    setUser(null);
    setShowAdminPanel(false);
  };

  const handleLikeToggle = async (memoryId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/memories/${memoryId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Instant response to sync liked state
        const updatedMemory = await res.json();
        setMemories((prev) => prev.map((m) => (m.id === memoryId ? updatedMemory : m)));
        if (activeMemory && activeMemory.id === memoryId) {
          setActiveMemory(updatedMemory);
        }
      }
    } catch (err) {
      console.error('Failed to toggle heart like:', err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        setActiveMemory(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Callback to locate custom notifications memories directly
  const handleViewMemoryById = (id: string) => {
    const memory = memories.find((m) => m.id === id);
    if (memory) {
      setActiveMemory(memory);
    } else {
      // Refresh list to find new memory
      loadDatabase().then(() => {
        const recheck = memories.find((m) => m.id === id);
        if (recheck) setActiveMemory(recheck);
      });
    }
  };

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-4" />
        <span className="text-xs tracking-widest uppercase font-semibold text-gray-500 font-mono">
          Bootstrapping Love Book...
        </span>
      </div>
    );
  }

  // Render Login state
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden select-none">
        
        {/* Aesthetic Background Orbs */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-rose-950/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-950/15 blur-[150px] pointer-events-none" />

        {/* Floating Bokeh elements */}
        <div className="absolute top-[30%] right-[10%] w-3 h-3 bg-rose-500/20 rounded-full animate-ping duration-1000" />
        <div className="absolute bottom-[25%] left-[15%] w-2 h-2 bg-amber-500/20 rounded-full animate-pulse" />

        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md p-8 text-white relative z-10">
          
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl mb-4 shadow">
              <Heart className="w-6 h-6 fill-rose-500/25 animate-pulse" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 font-mono">Welcome To Our Gallery</span>
            <h2 className="text-3xl font-medium font-serif italic mt-1 tracking-tight">The Wedding Memory Book</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              Please enter your guest account credentials to view all wedding ceremony photos and share yours with us!
            </p>
          </div>

          {loginError && (
            <div className="p-3 mb-5 text-xs text-red-400 bg-red-500/10 rounded-xl flex items-center gap-2 border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-semibold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                Guest Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. guest"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-500"
                  id="login-username-input"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                Guest Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="e.g. guest123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-500"
                  id="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-black font-bold rounded-full text-xs tracking-widest uppercase shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-login-submit"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Accessing Gallery...
                </>
              ) : (
                'Access Wedding Gallery'
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // Main Authenticated Application View
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans flex flex-col relative selection:bg-rose-500/30 overflow-x-hidden">
      
      {/* Atmospheric Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-950/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-950/10 blur-[150px] pointer-events-none z-0"></div>

      {/* 1. Main navigation navbar */}
      <div className="relative z-10">
        <Navbar
          user={user}
          token={token}
          onLogout={handleLogout}
          onOpenUpload={() => setIsUploadOpen(true)}
          onToggleAdmin={(show) => setShowAdminPanel(show)}
          showAdminPanel={showAdminPanel}
          onOpenProfile={() => setIsProfileOpen(true)}
          siteSettings={siteSettings}
          onMemoryClickById={handleViewMemoryById}
        />
      </div>

      {/* 2. Main content router */}
      {showAdminPanel && user.role === 'admin' ? (
        <AdminPanel
          token={token}
          currentUser={user}
          albums={albums}
          onRefreshAlbums={loadDatabase}
          siteSettings={siteSettings}
          onSettingsUpdate={(updated) => setSiteSettings(updated)}
        />
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* Hero Header */}
          <HeroSection siteSettings={siteSettings} memories={memories} onOpenUpload={() => setIsUploadOpen(true)} />

          {/* Album Browse Horizontal Ribbon */}
          <AlbumBrowse
            albums={albums}
            memories={memories}
            selectedAlbumId={selectedAlbumId}
            onSelectAlbum={(id) => setSelectedAlbumId(id)}
          />

          {/* Grid list gallery */}
          <TimelineGallery
            memories={memories}
            albums={albums}
            user={user}
            token={token}
            onMemoryClick={(m) => setActiveMemory(m)}
            onLikeToggle={handleLikeToggle}
            onDeleteMemory={handleDeleteMemory}
            selectedAlbumId={selectedAlbumId}
            onSelectAlbum={(id) => setSelectedAlbumId(id)}
            onRefreshMemories={loadDatabase}
          />
        </div>
      )}

      {/* Footer credits */}
      <footer className="py-10 text-center text-xs text-gray-400 border-t border-gray-150 dark:border-white/5 mt-16 bg-white dark:bg-black/20">
        <p className="font-serif-title text-sm font-semibold text-pink-500">Captured with love • {siteSettings.siteName}</p>
        <p className="mt-1">All memories preserved in original quality. Preserving your smiles forever.</p>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* MODAL WINDOWS */}
      {/* ------------------------------------------------------------- */}

      {/* Upload files drawer */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        albums={albums}
        token={token}
        onUploadSuccess={loadDatabase}
      />

      {/* User profile popup */}
      {isProfileOpen && (
        <UserProfile
          user={user}
          token={token}
          onUpdateUser={(updated) => setUser(updated)}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Fullscreen memory sliding viewer */}
      {activeMemory && (
        <MemoryViewer
          memory={activeMemory}
          allMemories={memories}
          user={user}
          token={token}
          onClose={() => setActiveMemory(null)}
          onLikeToggle={handleLikeToggle}
          onDeleteMemory={handleDeleteMemory}
          albums={albums}
          onMemoryUpdate={loadDatabase}
        />
      )}

    </div>
  );
}
