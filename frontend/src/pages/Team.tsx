import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Shield, Mail, Calendar, Crown, Trash2, ChevronDown } from 'lucide-react';
import { MagneticButton } from '../components/effects';

interface Member {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export default function Team() {
  const { user, currentOrg, members } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const canManageUsers = ['owner', 'admin'].includes(currentOrg?.role || '');

  const getRoleStyle = (role: string) => {
    const styles: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      owner: { 
        bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30',
        text: 'text-purple-300',
        icon: <Crown className="w-3 h-3" />
      },
      admin: { 
        bg: 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30',
        text: 'text-red-300',
        icon: <Shield className="w-3 h-3" />
      },
      manager: { 
        bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30',
        text: 'text-green-300',
        icon: null
      },
      member: { 
        bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
        text: 'text-cyan-300',
        icon: null
      },
      viewer: { 
        bg: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20 border-slate-500/30',
        text: 'text-slate-300',
        icon: null
      },
    };
    return styles[role] || styles.member;
  };

  const handleInvite = async () => {
    // TODO: Implement invite API call
    console.log('Inviting:', inviteEmail, 'as', inviteRole);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('member');
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    // TODO: Implement role change API call
    console.log('Changing role for', memberId, 'to', newRole);
  };

  const handleRemove = async (memberId: string) => {
    // TODO: Implement remove API call
    console.log('Removing member:', memberId);
  };

  // Demo members if API doesn't return any
  const displayMembers: Member[] = members?.length > 0 ? members : [
    { id: '1', email: 'admin@demo.com', name: 'Alice Admin', role: 'owner', joined_at: new Date().toISOString() },
    { id: '2', email: 'manager@demo.com', name: 'Mike Manager', role: 'manager', joined_at: new Date().toISOString() },
    { id: '3', email: 'member@demo.com', name: 'Sarah Developer', role: 'member', joined_at: new Date().toISOString() },
    { id: '4', email: 'viewer@demo.com', name: 'Victor Viewer', role: 'viewer', joined_at: new Date().toISOString() },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="text-[var(--text-secondary)]">Manage members of {currentOrg?.name || 'your organization'}</p>
          </div>
        </div>

        {canManageUsers && (
          <MagneticButton
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </MagneticButton>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: displayMembers.length, gradient: 'from-cyan-500 to-blue-500' },
          { label: 'Admins', value: displayMembers.filter(m => ['owner', 'admin'].includes(m.role)).length, gradient: 'from-purple-500 to-pink-500' },
          { label: 'Active Today', value: Math.ceil(displayMembers.length * 0.7), gradient: 'from-green-500 to-emerald-500' },
        ].map((stat, i) => (
          <div 
            key={stat.label}
            className="glass-elevated rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: `${(i + 1) * 50}ms` }}
          >
            <p className="text-[var(--text-muted)] text-sm font-medium">{stat.label}</p>
            <p className={`text-4xl font-bold mt-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div className="glass-elevated rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--cosmic-cyan)]" />
            Organization Members
          </h2>
        </div>
        
        <div className="divide-y divide-[var(--border-subtle)]">
          {displayMembers.map((member, index) => {
            const roleStyle = getRoleStyle(member.role);
            const isCurrentUser = member.email === user?.email;
            const canEdit = canManageUsers && member.role !== 'owner' && !isCurrentUser;

            return (
              <div 
                key={member.id}
                className="p-5 hover:bg-[var(--void-surface)] transition-colors group animate-slide-up"
                style={{ animationDelay: `${(index + 3) * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--cosmic-purple)] to-[var(--cosmic-magenta)] flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    )}
                    {isCurrentUser && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--cosmic-cyan)] rounded-full flex items-center justify-center text-[8px] font-bold text-black border-2 border-[var(--void-elevated)]">
                        YOU
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{member.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-4">
                    {canEdit ? (
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className={`appearance-none pl-4 pr-10 py-2 rounded-xl border ${roleStyle.bg} ${roleStyle.text} bg-transparent cursor-pointer font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cosmic-cyan)]/30`}
                        >
                          <option value="admin" className="bg-[var(--void-elevated)] text-white">Admin</option>
                          <option value="manager" className="bg-[var(--void-elevated)] text-white">Manager</option>
                          <option value="member" className="bg-[var(--void-elevated)] text-white">Member</option>
                          <option value="viewer" className="bg-[var(--void-elevated)] text-white">Viewer</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      </div>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl border ${roleStyle.bg} ${roleStyle.text} font-medium text-sm flex items-center gap-2`}>
                        {roleStyle.icon}
                        {member.role}
                      </span>
                    )}

                    {/* Joined Date */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <Calendar className="w-4 h-4" />
                      {new Date(member.joined_at).toLocaleDateString()}
                    </div>

                    {/* Remove Button */}
                    {canEdit && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--cosmic-red)] hover:bg-[var(--cosmic-red)]/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          />
          
          <div className="relative w-full max-w-md glass-elevated rounded-3xl p-8 animate-pop-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--cosmic-cyan)] to-[var(--cosmic-purple)] flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Invite Member</h3>
                <p className="text-[var(--text-muted)]">Add someone to your organization</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-cosmic"
                  placeholder="colleague@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-cosmic appearance-none cursor-pointer"
                >
                  <option value="admin">Admin - Full management access</option>
                  <option value="manager">Manager - Team management</option>
                  <option value="member">Member - Standard access</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-surface)] transition-all font-medium"
                >
                  Cancel
                </button>
                <MagneticButton
                  className="flex-1 btn-primary"
                  onClick={handleInvite}
                >
                  Send Invite
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
