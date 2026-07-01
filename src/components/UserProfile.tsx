/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Key, CheckCircle, AlertCircle, Sparkles, Loader2, Calendar } from 'lucide-react';
import { User as UserType } from '../types';

interface UserProfileProps {
  user: UserType;
  token: string;
  onUpdateUser: (updated: UserType) => void;
  onClose: () => void;
}

export default function UserProfile({ user, token, onUpdateUser, onClose }: UserProfileProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  
  // Password changes
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status indicators
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Available beautiful illustration avatar options (gorgeous preset cards)
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop'
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    if (!displayName.trim()) {
      setProfileError('Display name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          avatarUrl: avatarUrl || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdateUser(updated);
        setProfileSuccess('Profile updated successfully!');
      } else {
        const err = await res.json();
        setProfileError(err.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        setPasswordSuccess('Password successfully updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        setPasswordError(err.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden shadow-2xl rounded-3xl bg-zinc-950 border border-white/10 flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-xl font-medium text-white font-serif italic">
              Guest Profile &amp; Settings
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Customize how other wedding guests see you in the comment sections
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-slate-200 rounded-full transition cursor-pointer"
            id="btn-close-profile-modal"
          >
            Done
          </button>
        </div>

        {/* Content body scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quick diagnostics profile header card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center text-base font-bold text-black uppercase shrink-0 shadow">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                displayName.charAt(0)
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-400 font-mono uppercase tracking-wider block">Wedding Guest Profile</span>
              <h4 className="font-semibold text-sm text-white">{displayName}</h4>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>Account created: {new Date(user.joinDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Form 1: Edit Profile details */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h4 className="text-sm font-semibold text-white border-b border-white/5 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-rose-400" />
              Profile Details
            </h4>

            {profileError && (
              <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            {profileSuccess && (
              <div className="p-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                Display Name (couple friendly)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Grandma Rose"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder-slate-500"
                id="profile-displayName-input"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                Avatar Image Presets
              </label>
              <div className="flex gap-3 overflow-x-auto py-1">
                {avatarPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      avatarUrl === preset ? 'border-rose-500 scale-105' : 'border-transparent'
                    }`}
                  >
                    <img src={preset} className="w-full h-full object-cover" alt={`Preset ${idx}`} />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or paste custom image avatar URL..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder-slate-500 mt-2.5"
                id="profile-avatarUrl-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-white text-black hover:bg-slate-200 font-semibold rounded-full text-xs transition cursor-pointer"
              id="btn-update-profile-submit"
            >
              Save Profile Info
            </button>
          </form>

          {/* Form 2: Reset Password */}
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-semibold text-white border-b border-white/5 pb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-rose-400" />
              Security / Update Password
            </h4>

            {passwordError && (
              <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder-slate-500"
                id="password-current-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder-slate-500"
                  id="password-new-input"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-rose-400 block mb-1.5 uppercase tracking-widest font-mono">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder-slate-500"
                  id="password-confirm-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-full text-xs transition cursor-pointer"
              id="btn-update-password-submit"
            >
              Update Password
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
