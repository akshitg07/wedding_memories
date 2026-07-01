/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Database,
  ShieldCheck,
  Sliders,
  Terminal,
  UserPlus,
  Lock,
  Check,
  X,
  Trash2,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { User, Album, SiteSettings, ActivityLog } from '../types';

interface AdminPanelProps {
  token: string;
  currentUser: User;
  albums: Album[];
  onRefreshAlbums: () => void;
  onSettingsUpdate: (settings: SiteSettings) => void;
  siteSettings: SiteSettings;
}

interface StatsData {
  totalFiles: number;
  totalImages: number;
  totalVideos: number;
  totalBytesUsed: number;
  userStats: Array<{
    userId: string;
    username: string;
    displayName: string;
    uploadCount: number;
    likesReceived: number;
  }>;
  uploadTrend: Array<{
    date: string;
    count: number;
  }>;
  health: {
    status: string;
    uptime: number;
    memoryUsed: string;
    memoryAvailable: string;
  };
}

interface ModerationMemory {
  id: string;
  originalName: string;
  uploaderName: string;
  type: 'image' | 'video';
  uploadDate: string;
  filename: string;
}

export default function AdminPanel({ token, currentUser, albums, onRefreshAlbums, onSettingsUpdate, siteSettings }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'moderation' | 'settings' | 'logs' | 'samba'>('stats');
  
  // Dashboard states
  const [stats, setStats] = useState<StatsData | null>(null);
  
  // Users states
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Moderation states
  const [pendingMemories, setPendingMemories] = useState<ModerationMemory[]>([]);

  // Logs states
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Site Settings state
  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [requireModeration, setRequireModeration] = useState(siteSettings.requireModeration);
  const [allowDownloads, setAllowDownloads] = useState(siteSettings.allowDownloads);
  const [primaryColor, setPrimaryColor] = useState(siteSettings.primaryColor);

  // Album creation state
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [albumSuccess, setAlbumSuccess] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  // Access Control state
  const [accessControlUserId, setAccessControlUserId] = useState<string | null>(null);
  const [accessControlAllowedIds, setAccessControlAllowedIds] = useState<string[]>([]);

  // Samba settings state
  const [sambaEnabled, setSambaEnabled] = useState(false);
  const [sambaType, setSambaType] = useState<'mount' | 'direct'>('mount');
  const [mountPath, setMountPath] = useState('');
  const [smbHost, setSmbHost] = useState('');
  const [smbShare, setSmbShare] = useState('');
  const [smbUser, setSmbUser] = useState('');
  const [smbPass, setSmbPass] = useState('');
  const [smbDomain, setSmbDomain] = useState('WORKGROUP');
  const [remoteFolder, setRemoteFolder] = useState('');
  const [sambaAutoSync, setSambaAutoSync] = useState(false);
  const [sambaSyncStatus, setSambaSyncStatus] = useState('idle');
  const [sambaSyncMessage, setSambaSyncMessage] = useState('');
  const [sambaLastSyncTime, setSambaLastSyncTime] = useState('');
  const [sambaLogs, setSambaLogs] = useState('');
  const [sambaConfigSuccess, setSambaConfigSuccess] = useState('');
  const [sambaConfigError, setSambaConfigError] = useState('');
  const [isSambaSyncing, setIsSambaSyncing] = useState(false);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  };

  // Fetch Pending Moderation
  const fetchPending = async () => {
    try {
      const res = await fetch('/api/memories?sort=newest', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Pending are memories where isApproved = false
        setPendingMemories(data.filter((m: any) => !m.isApproved));
      }
    } catch (err) {
      console.error('Error fetching pending memories:', err);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch Samba Config
  const fetchSambaConfig = async () => {
    try {
      const res = await fetch('/api/samba/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSambaEnabled(data.enabled || false);
        setSambaType(data.type || 'mount');
        setMountPath(data.mountPath || '');
        setSmbHost(data.smbHost || '');
        setSmbShare(data.smbShare || '');
        setSmbUser(data.smbUser || '');
        setSmbPass(data.smbPass || '');
        setSmbDomain(data.smbDomain || 'WORKGROUP');
        setRemoteFolder(data.remoteFolder || '');
        setSambaSyncStatus(data.syncStatus || 'idle');
        setSambaSyncMessage(data.syncMessage || '');
        setSambaLastSyncTime(data.lastSyncTime || '');
        setIsSambaSyncing(data.syncStatus === 'syncing');
      }
    } catch (err) {
      console.error('Error fetching Samba config:', err);
    }
  };

  // Fetch Samba logs
  const fetchSambaLogs = async () => {
    try {
      const res = await fetch('/api/samba/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSambaLogs(data.logs || '');
      }
    } catch (err) {
      console.error('Error fetching Samba logs:', err);
    }
  };

  // Save Samba Config
  const handleSaveSambaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSambaConfigSuccess('');
    setSambaConfigError('');
    try {
      const res = await fetch('/api/samba/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: sambaEnabled,
          type: sambaType,
          mountPath,
          smbHost,
          smbShare,
          smbUser,
          smbPass,
          smbDomain,
          remoteFolder,
          autoSync: sambaAutoSync,
        }),
      });
      if (res.ok) {
        setSambaConfigSuccess('Samba integration configuration saved successfully!');
        fetchSambaConfig();
      } else {
        const errData = await res.json();
        setSambaConfigError(errData.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setSambaConfigError(err.message || 'Error occurred saving configuration.');
    }
  };

  // Trigger Sync
  const handleTriggerSambaSync = async () => {
    setIsSambaSyncing(true);
    setSambaSyncStatus('syncing');
    setSambaSyncMessage('Synchronization run triggered...');
    try {
      const res = await fetch('/api/samba/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setIsSambaSyncing(false);
        setSambaSyncStatus('error');
        setSambaSyncMessage('Failed to trigger background synchronization.');
      }
    } catch (err) {
      setIsSambaSyncing(false);
      setSambaSyncStatus('error');
      setSambaSyncMessage('Error triggering sync.');
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'moderation') fetchPending();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'samba') {
      fetchSambaConfig();
      fetchSambaLogs();
      
      // If actively syncing, poll every 2 seconds
      interval = setInterval(() => {
        fetchSambaLogs();
        fetch('/api/samba/config', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            setSambaSyncStatus(data.syncStatus || 'idle');
            setSambaSyncMessage(data.syncMessage || '');
            setSambaLastSyncTime(data.lastSyncTime || '');
            if (data.syncStatus === 'syncing') {
              setIsSambaSyncing(true);
            } else {
              setIsSambaSyncing(false);
            }
          })
          .catch((e) => console.error(e));
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, token]);

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) {
      setUserError('All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          displayName: newDisplayName,
          role: newUserRole,
        }),
      });

      if (res.ok) {
        setUserSuccess(`User account "${newUsername}" created successfully!`);
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setNewUserRole('user');
        fetchUsers();
      } else {
        const errData = await res.json();
        setUserError(errData.error || 'Failed to create user account.');
      }
    } catch (err) {
      setUserError('Network error while creating account.');
    }
  };

  // Toggle user status
  const toggleUserStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update User Password / Name
  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: editingDisplayName || undefined,
          password: editingPassword || undefined,
        }),
      });

      if (res.ok) {
        alert('User details updated successfully!');
        setEditingUserId(null);
        setEditingPassword('');
        setEditingDisplayName('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update user details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete user account
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this guest account?')) {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchUsers();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete user.');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Moderate upload (Approve/Reject)
  const handleModerateUpload = async (id: string, approve: boolean) => {
    try {
      const endpoint = approve ? `/api/memories/${id}/approve` : `/api/memories/${id}`;
      const method = approve ? 'PUT' : 'DELETE';
      const body = approve ? JSON.stringify({ approve: true }) : undefined;

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (res.ok) {
        setPendingMemories((prev) => prev.filter((m) => m.id !== id));
        fetchStats(); // Update stats counting
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siteName,
          requireModeration,
          allowDownloads,
          primaryColor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdate(data);
        alert('Site configuration saved successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Album
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlbumSuccess('');
    if (!newAlbumName.trim()) return;

    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAlbumName,
          description: newAlbumDesc,
          parentId: selectedParentId || null,
        }),
      });

      if (res.ok) {
        setAlbumSuccess(`Album "${newAlbumName}" successfully created!`);
        setNewAlbumName('');
        setNewAlbumDesc('');
        setSelectedParentId('');
        onRefreshAlbums();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create album.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Album
  const handleDeleteAlbum = async (albumId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this album? Memories inside it will not be deleted, but will be moved to the root gallery.')) {
      try {
        const res = await fetch(`/api/albums/${albumId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          onRefreshAlbums();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete album.');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Save guest visibility rules
  const handleSaveAccessControl = async () => {
    if (!accessControlUserId) return;
    try {
      const res = await fetch(`/api/admin/users/${accessControlUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          allowedAlbumIds: accessControlAllowedIds,
        }),
      });
      if (res.ok) {
        setAccessControlUserId(null);
        fetchUsers(); // Refresh the list of guest accounts
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save visibility rules.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatStorage = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-medium text-white font-serif italic tracking-tight">
          Wedding Admin Command Deck
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Manage guest accounts, moderate uploads, and review storage utilization diagnostics.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-full mb-8 overflow-x-auto gap-1 w-fit max-w-full">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-stats"
        >
          <Database className="w-3.5 h-3.5" />
          Dashboard Stats
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-users"
        >
          <Users className="w-3.5 h-3.5" />
          Manage Guest Users
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'moderation'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-moderation"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Moderation Queue ({pendingMemories.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-settings"
        >
          <Sliders className="w-3.5 h-3.5" />
          Site Settings &amp; Albums
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-logs"
        >
          <Terminal className="w-3.5 h-3.5" />
          Audit Logs
        </button>

        <button
          onClick={() => setActiveTab('samba')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full transition shrink-0 cursor-pointer ${
            activeTab === 'samba'
              ? 'bg-white/15 border border-white/15 text-white shadow-sm'
              : 'border border-transparent text-slate-400 hover:text-white'
          }`}
          id="tab-samba"
        >
          <HardDrive className="w-3.5 h-3.5" />
          Samba / SMB Sync
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Stats / Dashboard */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Numeric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest">Total Uploads</span>
                <h3 className="text-3xl font-medium text-white mt-1.5 font-mono">{stats.totalFiles}</h3>
                <p className="text-xs text-slate-400 mt-1">{stats.totalImages} images • {stats.totalVideos} videos</p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest">Storage Utilized</span>
                <h3 className="text-3xl font-medium text-white mt-1.5 font-mono">{formatStorage(stats.totalBytesUsed)}</h3>
                <p className="text-xs text-slate-400 mt-1">S3 and local unified path</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest">Node Uptime</span>
                <h3 className="text-2xl font-medium text-white mt-2 font-mono">{stats.health.uptime}s</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Docker container age</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest">Node Memory</span>
                <h3 className="text-xl font-medium text-white mt-2.5 font-mono">{stats.health.memoryUsed}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">{stats.health.memoryAvailable} free</p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                <Settings className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Graphical Section: Line Trends & Media splits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Line Chart (Daily Uploads) */}
            <div className="lg:col-span-2 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-base font-medium text-white font-serif italic">
                  Upload Growth Metrics (Last 7 Days)
                </h4>
                <span className="px-2 py-1 text-[9px] font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-lg uppercase tracking-wider font-mono">
                  Live Trend
                </span>
              </div>

              {/* Draw Custom SVG Line Chart */}
              <div className="w-full h-64">
                <svg viewBox="0 0 500 200" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="40" y1="60" x2="480" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

                  {/* Area Under Curve Gradient */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" stopColor-opacity="0.3" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Path generation from upload trend */}
                  {(() => {
                    const trend = stats.uploadTrend;
                    if (trend.length === 0) return null;
                    const maxCount = Math.max(...trend.map((t) => t.count), 5); // scale height based on counts

                    // Map days to coordinates
                    const points = trend.map((t, idx) => {
                      const x = 40 + idx * (440 / (trend.length - 1));
                      const y = 170 - (t.count / maxCount) * 130;
                      return { x, y, date: t.date, count: t.count };
                    });

                    // Construct path string
                    const pathStr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaStr = `${pathStr} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                    return (
                      <>
                        {/* Area shading */}
                        <path d={areaStr} fill="url(#chartGrad)" />

                        {/* Line path */}
                        <path d={pathStr} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Interactive circles */}
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#f43f5e" className="hover:scale-150 transition" />
                            <circle cx={p.x} cy={p.y} r="7" stroke="#000000" strokeWidth="1.5" fill="none" className="pointer-events-none" />
                            {/* Text values */}
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f43f5e" className="font-mono">
                              {p.count}
                            </text>
                            {/* X Labels */}
                            <text x={p.x} y="185" textAnchor="middle" fontSize="9" fill="#94a3b8" className="font-mono">
                              {p.date.substring(5)}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Storage Radial and Media Ratios (Donut Chart) */}
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-medium text-white font-serif italic mb-4">
                  Media Allocations
                </h4>

                <div className="flex items-center justify-center py-6">
                  {/* Custom Donut Chart */}
                  <svg width="150" height="150" viewBox="0 0 100 100" className="-rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    {(() => {
                      const total = stats.totalImages + stats.totalVideos;
                      if (total === 0) return null;
                      const imagePct = stats.totalImages / total;
                      const strokeDasharray = `${imagePct * 251.2} 251.2`;
                      return (
                        <circle
                           cx="50"
                           cy="50"
                           r="40"
                           fill="none"
                           stroke="#f43f5e" // Rose for images
                           strokeWidth="8"
                           strokeDasharray={strokeDasharray}
                           className="transition-all"
                        />
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-slate-400">Photos / Images</span>
                  </div>
                  <span className="font-semibold text-white font-mono">
                    {stats.totalImages} ({stats.totalFiles ? Math.round((stats.totalImages / stats.totalFiles) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-slate-700 rounded-full" />
                    <span className="text-slate-400">Videos</span>
                  </div>
                  <span className="font-semibold text-white font-mono">
                    {stats.totalVideos} ({stats.totalFiles ? Math.round((stats.totalVideos / stats.totalFiles) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* List Section: Top uploaders */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <h4 className="text-base font-medium text-white font-serif italic mb-5">
              Top Guest Contributors
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-[9px] uppercase text-rose-400 border-b border-white/10 font-mono tracking-widest font-bold">
                  <tr>
                    <th className="py-3">Guest</th>
                    <th className="py-3 text-right">Uploads Added</th>
                    <th className="py-3 text-right">Social Likes Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.userStats.map((item) => (
                    <tr key={item.userId} className="hover:bg-white/5 transition">
                      <td className="py-3.5 font-medium text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-xs uppercase">
                          {item.displayName.charAt(0)}
                        </div>
                        <div>
                          <span>{item.displayName}</span>
                          <span className="text-xs text-slate-500 block font-mono">@{item.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-200 font-semibold">
                        {item.uploadCount} files
                      </td>
                      <td className="py-3.5 text-right font-mono text-rose-400 font-semibold">
                        {item.likesReceived} ♥
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Manage Guest Users */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          
          {/* User Creation Card (Left Column) */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <h4 className="text-base font-medium text-white font-serif italic flex items-center gap-2 mb-5">
              <UserPlus className="w-5 h-5 text-rose-400" />
              Create Guest Account
            </h4>

            {userError && (
              <div className="p-3 mb-4 text-xs text-rose-400 bg-rose-500/10 rounded-xl flex items-center gap-1.5 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}
            {userSuccess && (
              <div className="p-3 mb-4 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl flex items-center gap-1.5 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{userSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Guest Username (For login)
                </label>
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600"
                  id="input-user-username"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Default Password
                </label>
                <input
                  type="password"
                  placeholder="e.g. guestPassword123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600"
                  id="input-user-password"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Display Name (Couple-friendly)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uncle John &amp; Aunt Mary"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600"
                  id="input-user-displayname"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  System Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 cursor-pointer"
                  id="select-user-role"
                >
                  <option value="user" className="bg-zinc-950 text-white">Standard Wedding Guest</option>
                  <option value="admin" className="bg-zinc-950 text-white">Wedding Coordinator / Host (Admin)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-full text-xs uppercase tracking-wider shadow-lg shadow-rose-500/10 cursor-pointer transition"
                id="btn-create-user-submit"
              >
                Create Account
              </button>
            </form>
          </div>

          {/* Users Directory Table (Right Column, 2/3 wide) */}
          <div className="lg:col-span-2 p-6 bg-white/5 rounded-2xl border border-white/10">
            <h4 className="text-base font-medium text-white font-serif italic mb-5">
              Registered Guest Accounts ({users.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-[9px] uppercase text-rose-400 border-b border-white/10 font-mono tracking-widest font-bold">
                  <tr>
                    <th className="py-3">Uploader / Guest Details</th>
                    <th className="py-3">System Role</th>
                    <th className="py-3">Folder Access</th>
                    <th className="py-3">Active Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="py-4 text-white">
                        {editingUserId === u.id ? (
                          <div className="space-y-2 max-w-[200px]">
                            <input
                              type="text"
                              value={editingDisplayName}
                              onChange={(e) => setEditingDisplayName(e.target.value)}
                              placeholder="Display Name"
                              className="w-full px-3 py-1.5 text-xs border border-white/10 rounded-full bg-black/40 text-white focus:outline-none focus:border-rose-500/50"
                            />
                            <input
                              type="password"
                              value={editingPassword}
                              onChange={(e) => setEditingPassword(e.target.value)}
                              placeholder="New Password (or blank)"
                              className="w-full px-3 py-1.5 text-xs border border-white/10 rounded-full bg-black/40 text-white focus:outline-none focus:border-rose-500/50 block"
                            />
                            <div className="flex gap-2 pl-1">
                              <button
                                onClick={() => handleUpdateUser(u.id)}
                                className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 rounded-full text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-3 py-1 bg-white/10 border border-white/15 hover:bg-white/15 text-slate-300 rounded-full text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                u.displayName.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-semibold block text-sm">{u.displayName}</span>
                              <span className="text-xs text-slate-500 block font-mono">@{u.username}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-4">
                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider font-mono border ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Full Access
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-300">
                              {u.allowedAlbumIds && u.allowedAlbumIds.length > 0 ? (
                                <span className="font-semibold text-rose-400">
                                  {u.allowedAlbumIds.length} folder(s)
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">All folders</span>
                              )}
                            </span>
                            <button
                              onClick={() => {
                                setAccessControlUserId(u.id);
                                setAccessControlAllowedIds(u.allowedAlbumIds || []);
                              }}
                              className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded transition cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-4">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          disabled={u.id === currentUser.id}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold select-none border tracking-wider transition-all cursor-pointer ${
                            u.isActive
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </button>
                      </td>

                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingUserId !== u.id && (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditingDisplayName(u.displayName);
                              }}
                              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
                              title="Reset Password / Edit Name"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === currentUser.id}
                            className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 rounded-full text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Moderation Queue */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'moderation' && (
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 animate-fade-in">
          <h4 className="text-base font-medium text-white font-serif italic mb-1.5">
            Pending Moderation Queue ({pendingMemories.length})
          </h4>
          <p className="text-xs text-slate-400 mb-6">
            Review guest uploads before they are added to the public wedding memories page.
          </p>

          {pendingMemories.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
              <h5 className="font-semibold text-white text-base">All caught up!</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm font-mono">
                No memories currently require approval. Guests can see their uploads instantly!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pendingMemories.map((m) => (
                <div
                  key={m.id}
                  className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    {m.type === 'video' ? (
                      <video src={`/uploads/${m.filename}`} className="w-full h-full object-cover" controls={false} />
                    ) : (
                      <img src={`/uploads/${m.filename}`} alt={m.originalName} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[9px] font-bold bg-black/80 backdrop-blur rounded text-white uppercase tracking-wider font-mono">
                      {m.type}
                    </span>
                  </div>

                  <div className="p-4">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400 font-mono">Guest Uploader</span>
                    <h5 className="font-semibold text-sm text-white mt-0.5">{m.uploaderName}</h5>
                    <p className="text-xs text-slate-400 mt-1 truncate font-mono">{m.originalName}</p>
                    <span className="text-[9px] text-slate-500 mt-2 block font-mono">
                      Uploaded: {new Date(m.uploadDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-4 border-t border-white/5 flex gap-2 bg-black/20">
                    <button
                      onClick={() => handleModerateUpload(m.id, false)}
                      className="flex-1 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-semibold rounded-full text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                    <button
                      onClick={() => handleModerateUpload(m.id, true)}
                      className="flex-1 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-full text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Settings & Albums */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
          {/* Site Configurations form */}
          <form
            onSubmit={handleSaveSettings}
            className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6"
          >
            <h4 className="text-base font-medium text-white font-serif italic flex items-center gap-2 border-b border-white/5 pb-3">
              <Sliders className="w-5 h-5 text-rose-400" />
              General Wedding Site Controls
            </h4>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Wedding Event Name (Header title)
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white"
                  id="input-site-name"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Wedding Accent Color Theme
                </label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  {[
                    { hex: '#db2777', name: 'Rose Gold' },
                    { hex: '#4f46e5', name: 'Royal Indigo' },
                    { hex: '#059669', name: 'Emerald Velvet' },
                    { hex: '#ea580c', name: 'Tangerine Sunset' },
                    { hex: '#4b5563', name: 'Minimalist Zinc' },
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setPrimaryColor(color.hex)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border flex items-center gap-1.5 transition cursor-pointer ${
                        primaryColor === color.hex
                          ? 'border-transparent text-white'
                          : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      style={{ backgroundColor: primaryColor === color.hex ? color.hex : 'transparent' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-200 block">
                      Enable Upload Moderation Gate
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      When active, guest media requires coordinator review before publishing.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireModeration}
                    onChange={(e) => setRequireModeration(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-rose-500 focus:ring-0 cursor-pointer"
                    id="checkbox-require-moderation"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-200 block">
                      Allow Guests to Download Original Quality Files
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Toggle whether standard guests can pull full-size originals.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDownloads}
                    onChange={(e) => setAllowDownloads(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-rose-500 focus:ring-0 cursor-pointer"
                    id="checkbox-allow-downloads"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-full text-xs uppercase tracking-wider shadow-lg shadow-rose-500/10 cursor-pointer transition"
              id="btn-save-settings-submit"
            >
              Save Site Configuration
            </button>
          </form>

          {/* Album Creation Form */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
            <h4 className="text-base font-medium text-white font-serif italic flex items-center gap-2 border-b border-white/5 pb-3">
              <HardDrive className="w-5 h-5 text-rose-400" />
              Add Custom Ceremony Album / Folders
            </h4>

            {albumSuccess && (
              <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl flex items-center gap-1.5 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>{albumSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Album Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pre-Wedding Shoot"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600"
                  id="input-album-name"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Parent Folder (Optional, for Nested/Sub-album hierarchy)
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white cursor-pointer"
                >
                  <option value="">No Parent (Root Album/Folder)</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                  Brief description for guests
                </label>
                <textarea
                  placeholder="e.g. Stunning sunsets and backdrops..."
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600"
                  id="textarea-album-desc"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-full text-xs uppercase tracking-wider shadow-lg shadow-rose-500/10 cursor-pointer transition"
                id="btn-create-album-submit"
              >
                Create Event Album
              </button>
            </form>

            <div className="border-t border-white/5 pt-6 mt-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-4">
                Existing Event Folders ({albums.length})
              </span>
              {albums.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No ceremony folders created yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {albums.map((album) => {
                    const parentAlbum = album.parentId ? albums.find(a => a.id === album.parentId) : null;
                    return (
                      <div key={album.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="truncate max-w-[75%]">
                          <h5 className="font-semibold text-xs text-white truncate">{album.name}</h5>
                          {album.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{album.description}</p>
                          )}
                          {parentAlbum && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono inline-block mt-1">
                              Sub-folder of: {parentAlbum.name}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlbum(album.id)}
                          className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 rounded-full text-rose-400 transition cursor-pointer"
                          title="Delete Album"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Audit Logs */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-medium text-white font-serif italic">
                Security Audit Log Registry
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of file uploads, account logins, and system configuration adjustments.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-white/10 border border-white/10 hover:bg-white/15 text-white font-bold rounded-full transition cursor-pointer"
              id="btn-refresh-logs"
            >
              Refresh Log
            </button>
          </div>

          <div className="overflow-y-auto max-h-[500px] border border-white/10 rounded-xl bg-black/20">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[9px] uppercase text-rose-400 border-b border-white/10 bg-black/30 font-mono tracking-widest font-bold">
                <tr>
                  <th className="px-4 py-3">Event Timestamp</th>
                  <th className="px-4 py-3">Action Triggered</th>
                  <th className="px-4 py-3">User details</th>
                  <th className="px-4 py-3">System Diagnostics Details</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        log.action === 'UPLOAD'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : log.action === 'LOGIN'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : log.action === 'USER_DELETE' || log.action === 'DELETE_UPLOAD'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {log.username || 'System'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {log.details}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB content: Samba/SMB Integration */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'samba' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Configuration Column */}
            <div className="lg:col-span-2 space-y-6">
              
              <form onSubmit={handleSaveSambaConfig} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-rose-400" />
                    <h4 className="text-base font-medium text-white font-serif italic">
                      Samba / SMB Sync Setup
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Enable Samba Link</span>
                    <input
                      type="checkbox"
                      checked={sambaEnabled}
                      onChange={(e) => setSambaEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 text-rose-500 focus:ring-0 cursor-pointer animate-none"
                    />
                  </div>
                </div>

                {sambaConfigSuccess && (
                  <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{sambaConfigSuccess}</span>
                  </div>
                )}
                {sambaConfigError && (
                  <div className="p-3 text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sambaConfigError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                      Samba Integration Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSambaType('mount')}
                        className={`py-2 px-4 rounded-full text-xs font-semibold border transition cursor-pointer text-center ${
                          sambaType === 'mount'
                            ? 'bg-rose-500 border-transparent text-white'
                            : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Local Mounted Path (Samba / HDD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSambaType('direct')}
                        className={`py-2 px-4 rounded-full text-xs font-semibold border transition cursor-pointer text-center ${
                          sambaType === 'direct'
                            ? 'bg-rose-500 border-transparent text-white'
                            : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Direct Network Samba Connection (SMB)
                      </button>
                    </div>
                  </div>

                  {sambaType === 'mount' ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                        Local Mounted Server Path
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. /mnt/samba/wedding_photos"
                        value={mountPath}
                        onChange={(e) => setMountPath(e.target.value)}
                        className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5 ml-1 leading-relaxed">
                        Specify the absolute directory path on the server where the Samba share or drive is mounted. The app will recursively read files from this directory.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Samba Server Host / IP Address
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.150"
                          value={smbHost}
                          onChange={(e) => setSmbHost(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Share Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. wedding_files"
                          value={smbShare}
                          onChange={(e) => setSmbShare(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Subfolder inside share (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. raw_media (leave blank for root)"
                          value={remoteFolder}
                          onChange={(e) => setRemoteFolder(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Samba Username
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. guest or administrator"
                          value={smbUser}
                          onChange={(e) => setSmbUser(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Samba Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={smbPass}
                          onChange={(e) => setSmbPass(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1 font-mono">
                          Active Directory / SMB Domain (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="WORKGROUP (Default)"
                          value={smbDomain}
                          onChange={(e) => setSmbDomain(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-sm focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-full text-xs uppercase tracking-wider shadow-lg shadow-rose-500/10 cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Save Integration Settings
                </button>
              </form>
            </div>

            {/* Sync Controls Column */}
            <div className="space-y-6">
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                <h4 className="text-base font-medium text-white font-serif italic border-b border-white/5 pb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  Samba Synchronization Status
                </h4>

                <div className="space-y-4">
                  
                  {/* Status Indicator Pill */}
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Current Status</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      sambaSyncStatus === 'syncing'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse'
                        : sambaSyncStatus === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : sambaSyncStatus === 'error'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-500/10 border-white/10 text-slate-400'
                    }`}>
                      ● {sambaSyncStatus}
                    </span>
                  </div>

                  {sambaSyncMessage && (
                    <div className="p-3.5 bg-black/20 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300 leading-normal">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 font-mono">Status Details</span>
                      {sambaSyncMessage}
                    </div>
                  )}

                  <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-1.5 font-mono text-xs text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] uppercase">Last Synced:</span>
                      <span className="text-white text-[11px]">
                        {sambaLastSyncTime ? new Date(sambaLastSyncTime).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!sambaEnabled || isSambaSyncing}
                    onClick={handleTriggerSambaSync}
                    className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                      !sambaEnabled
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                        : isSambaSyncing
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/20 cursor-not-allowed animate-pulse'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white cursor-pointer shadow-lg shadow-emerald-500/10'
                    }`}
                  >
                    <HardDrive className={`w-4 h-4`} />
                    {isSambaSyncing ? 'Synchronizing Share...' : 'Sync Samba Media Now'}
                  </button>
                  
                  {!sambaEnabled && (
                    <p className="text-[10px] text-rose-400 text-center font-mono leading-relaxed mt-1">
                      ⚠️ Please enable the Samba Link toggle in settings first to trigger media scans.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logs Terminal view */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-400" />
                <h4 className="text-base font-medium text-white font-serif italic">
                  Real-Time Import &amp; Sync Diagnostics Log
                </h4>
              </div>
              <button
                onClick={fetchSambaLogs}
                className="px-3 py-1 text-[9px] uppercase tracking-wider bg-white/10 border border-white/5 hover:bg-white/15 text-white font-bold rounded-full transition cursor-pointer"
              >
                Fetch New Logs
              </button>
            </div>

            <div className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {sambaLogs ? sambaLogs : 'Ready. Click "Sync Samba Media Now" to display real-time scanning logs.'}
            </div>
          </div>

        </div>
      )}

      {/* Guest Folder Access Control Modal */}
      {accessControlUserId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h4 className="font-serif italic text-base text-white">Guest Folder Access Control</h4>
              <button
                onClick={() => setAccessControlUserId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Select which specific ceremony albums are visible to this guest account. If no folders are checked, this user has access to all folders by default.
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-6">
              {albums.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No albums or folders created yet.</p>
              ) : (
                albums.map((album) => {
                  const isChecked = accessControlAllowedIds.includes(album.id);
                  const parentAlbum = album.parentId ? albums.find(a => a.id === album.parentId) : null;
                  return (
                    <label
                      key={album.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setAccessControlAllowedIds(prev => prev.filter(id => id !== album.id));
                          } else {
                            setAccessControlAllowedIds(prev => [...prev, album.id]);
                          }
                        }}
                        className="w-4 h-4 rounded border-white/10 text-rose-500 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate">{album.name}</span>
                        {parentAlbum && (
                          <span className="text-[9px] text-amber-400 font-mono">Sub-folder of {parentAlbum.name}</span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAccessControlUserId(null)}
                className="flex-1 py-2 rounded-full border border-white/10 hover:bg-white/5 text-xs text-slate-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAccessControl}
                className="flex-1 py-2 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-xs text-white font-semibold transition shadow-lg shadow-rose-500/10"
              >
                Save Visibility Rules
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
