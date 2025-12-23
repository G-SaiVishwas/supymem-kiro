import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

export default function Settings() {
  const { user, currentOrg, organizations, switchOrganization, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await api.updateMe({ name });
      await refreshUser();
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrgSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      owner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      manager: 'bg-green-500/20 text-green-400 border-green-500/30',
      member: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      viewer: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[role] || colors.member;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and organization settings</p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </h2>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-slate-900/30 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Organization Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Organizations
        </h2>

        <div className="space-y-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                org.id === currentOrg?.id
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : 'bg-slate-900/30 border-slate-700/30 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-medium">{org.name}</h3>
                  <p className="text-slate-400 text-sm">{org.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full border ${getRoleBadgeColor(org.role)}`}>
                  {org.role}
                </span>
                {org.id !== currentOrg?.id && (
                  <button
                    onClick={() => handleOrgSwitch(org.id)}
                    className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Switch
                  </button>
                )}
                {org.id === currentOrg?.id && (
                  <span className="px-3 py-1 text-sm text-purple-400">Current</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Role Info */}
      {currentOrg && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Your Permissions
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/30 rounded-lg">
              <p className="text-slate-400 text-sm">View Dashboard</p>
              <p className="text-green-400 font-medium">✓ Allowed</p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-lg">
              <p className="text-slate-400 text-sm">Manage Tasks</p>
              <p className={currentOrg.role !== 'viewer' ? 'text-green-400' : 'text-red-400'}>
                {currentOrg.role !== 'viewer' ? '✓ Allowed' : '✗ Denied'}
              </p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-lg">
              <p className="text-slate-400 text-sm">View Analytics</p>
              <p className={['owner', 'admin', 'manager'].includes(currentOrg.role) ? 'text-green-400' : 'text-red-400'}>
                {['owner', 'admin', 'manager'].includes(currentOrg.role) ? '✓ Allowed' : '✗ Denied'}
              </p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-lg">
              <p className="text-slate-400 text-sm">Manage Team</p>
              <p className={['owner', 'admin'].includes(currentOrg.role) ? 'text-green-400' : 'text-red-400'}>
                {['owner', 'admin'].includes(currentOrg.role) ? '✓ Allowed' : '✗ Denied'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

