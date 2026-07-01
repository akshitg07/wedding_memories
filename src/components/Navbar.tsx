/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldAlert,
  Sliders,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react';
import { User as UserType, Notification, SiteSettings } from '../types';

interface NavbarProps {
  user: UserType;
  token: string;
  onLogout: () => void;
  onOpenUpload: () => void;
  onToggleAdmin: (show: boolean) => void;
  showAdminPanel: boolean;
  onOpenProfile: () => void;
  siteSettings: SiteSettings;
  onMemoryClickById: (id: string) => void;
}

export default function Navbar({
  user,
  token,
  onLogout,
  onOpenUpload,
  onToggleAdmin,
  showAdminPanel,
  onOpenProfile,
  siteSettings,
  onMemoryClickById,
}: NavbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Load active theme from document body
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // Sync theme with HTML class
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  // Poll for notifications every 10 seconds for real-time responsiveness
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    setShowNotificationsDropdown(false);
    if (n.targetId) {
      onMemoryClickById(n.targetId);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/40 backdrop-blur-md text-slate-200">
      <div className="w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Branding logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onToggleAdmin(false)}
            className="flex items-center gap-2 text-left focus:outline-none"
            id="btn-brand-logo"
          >
            <span className="text-xl font-serif italic font-bold bg-gradient-to-tr from-rose-500 to-amber-500 bg-clip-text text-transparent hover:opacity-90 transition">
              {siteSettings.siteName}
            </span>
          </button>

          {/* Quick tabs (Admin toggle vs home) */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onToggleAdmin(false)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                !showAdminPanel
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-nav-gallery"
            >
              The Gallery
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => onToggleAdmin(true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
                  showAdminPanel
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-slate-400 hover:text-white'
                }`}
                id="btn-nav-admin"
              >
                <Sliders className="w-3 h-3" />
                Coordinator Deck
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions (Upload, Notification bell, profile dropdown) */}
        <div className="flex items-center gap-3">
          
          {/* Guest Upload Callout */}
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-black font-semibold rounded-full text-xs shadow-md transition flex items-center gap-1.5"
            id="btn-nav-upload"
          >
            Upload Memory
          </button>

          {/* Real-time Notification bell with dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowUserDropdown(false);
              }}
              className={`p-2 rounded-xl transition relative ${
                showNotificationsDropdown
                  ? 'bg-white/10 text-rose-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="btn-notification-bell"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 text-sm z-50 text-slate-200">
                <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
                  <span className="font-bold text-white">Wedding Alerts</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase transition"
                      id="btn-notifications-read-all"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No active notifications. Check back later!
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 text-xs cursor-pointer hover:bg-white/5 transition flex gap-2 items-start ${
                          !n.isRead ? 'bg-rose-500/10' : ''
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${!n.isRead ? 'bg-rose-400' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-300 line-clamp-2">{n.text}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {n.targetId && (
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 self-center" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile dropdown menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotificationsDropdown(false);
              }}
              className="flex items-center gap-1.5 p-1.5 hover:bg-white/5 rounded-xl transition"
              id="btn-user-dropdown-toggle"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.displayName.charAt(0)
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 text-slate-200">
                <div className="px-4 py-3 border-b border-white/10">
                  <span className="font-bold block text-white truncate">
                    {user.displayName}
                  </span>
                  <span className="text-xs text-slate-400 block truncate">
                    @{user.username}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenProfile();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 flex items-center gap-2 transition"
                    id="btn-profile-settings"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </button>

                  <div className="md:hidden">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onToggleAdmin(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 flex items-center gap-2 transition"
                    >
                      The Gallery
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onToggleAdmin(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 flex items-center gap-2 transition"
                      >
                        <Sliders className="w-4 h-4 text-slate-400" />
                        Coordinator Deck
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                    id="btn-logout-trigger"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout Account
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </nav>
  );
}
