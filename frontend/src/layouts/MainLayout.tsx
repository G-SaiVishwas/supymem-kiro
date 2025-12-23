import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  GitBranch,
  Zap,
  BarChart3,
  Settings,
  Search,
  Bell,
  Users,
  LogOut,
  ChevronDown,
  Command,
  Brain,
  Code2,
  Network,
  Target,
  Activity,
  Shield,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CursorGlow } from '../components/effects';
import { SystemHealthIndicator } from '../components/status/SystemHealthIndicator';
import { ModeIndicator } from '../components/onboarding/ModeIndicator';
import { TrustButton } from '../components/trust/TrustPanel';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  gradient?: string;
}

// System Understanding section
const systemNavigation: NavItem[] = [
  { name: 'System Map', href: '/system-map', icon: Network, gradient: 'from-cyan-500 to-purple-500' },
  { name: 'Org Health', href: '/health', icon: Activity, gradient: 'from-green-500 to-cyan-500' },
  { name: 'Intents', href: '/intents', icon: Target, gradient: 'from-purple-500 to-pink-500' },
];

// Main navigation
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, gradient: 'from-cyan-500 to-blue-500' },
  { name: 'Ask Agent', href: '/ask', icon: Brain, gradient: 'from-purple-500 to-pink-500' },
  { name: 'Central Knowledge', href: '/central-knowledge', icon: BookOpen, gradient: 'from-violet-500 to-purple-500' },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, gradient: 'from-green-500 to-emerald-500' },
  { name: 'Decisions', href: '/decisions', icon: GitBranch, gradient: 'from-orange-500 to-amber-500' },
  { name: 'Automations', href: '/automations', icon: Zap, gradient: 'from-yellow-500 to-orange-500' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, requiredRoles: ['owner', 'admin', 'manager'], gradient: 'from-blue-500 to-indigo-500' },
  { name: 'Team', href: '/team', icon: Users, requiredRoles: ['owner', 'admin', 'manager'], gradient: 'from-pink-500 to-rose-500' },
];

// Trust section
const trustNavigation: NavItem[] = [
  { name: 'Trust & Privacy', href: '/trust', icon: Shield, gradient: 'from-green-500 to-emerald-500' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currentOrg, organizations, logout, switchOrganization } = useAuth();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOrgSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setShowOrgDropdown(false);
  };

  const userRole = currentOrg?.role || 'member';

  const getRoleBadgeStyle = (role: string) => {
    const styles: { [key: string]: string } = {
      owner: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30',
      admin: 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border-red-500/30',
      manager: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30',
      member: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30',
      viewer: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-300 border-slate-500/30',
    };
    return styles[role] || styles.member;
  };

  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredRoles) return true;
    return item.requiredRoles.includes(userRole);
  });

  return (
    <div className="flex h-screen bg-[var(--void-deepest)] overflow-hidden">
      {/* Cursor Glow Effect */}
      <CursorGlow />
      
      {/* Subtle Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--cosmic-cyan)] rounded-full blur-[250px] opacity-[0.02]" />
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-r border-[var(--border-subtle)] bg-[var(--void-deep)]/80 backdrop-blur-xl flex flex-col relative z-10">
        {/* Logo & Org Switcher */}
        <div className="border-b border-[var(--border-subtle)]">
          <div className="h-16 flex items-center px-6">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/20 group-hover:shadow-cyan-500/40 flex items-center justify-center shadow-lg transition-shadow">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-tight leading-tight">
                  Supymem
                </span>
                <span className="text-xs font-medium -mt-0.5 text-cyan-400">
                  Knowledge Hub
                </span>
              </div>
            </div>
          </div>

          {/* Organization Switcher */}
          {currentOrg && (
            <div className="px-4 pb-4 relative">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--void-surface)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--void-elevated)] transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--cosmic-purple)] to-[var(--cosmic-magenta)] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/20">
                    {currentOrg.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white truncate max-w-[140px]">{currentOrg.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">Organization</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${showOrgDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showOrgDropdown && (
                <div className="absolute top-full left-4 right-4 mt-2 bg-[var(--void-elevated)] rounded-xl border border-[var(--border-default)] shadow-2xl z-50 overflow-hidden animate-slide-up">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSwitch(org.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--void-float)] transition-colors ${org.id === currentOrg.id ? 'bg-[var(--cosmic-cyan)]/10' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--cosmic-purple)] to-[var(--cosmic-magenta)] flex items-center justify-center text-white text-sm font-bold">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white truncate flex-1 text-left">{org.name}</span>
                      {org.id === currentOrg.id && (
                        <div className="w-2 h-2 rounded-full bg-[var(--cosmic-cyan)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* System Understanding Section */}
          <div className="mb-4">
            <p className="px-4 py-2 text-xs font-medium text-[var(--text-ghost)] uppercase tracking-wider">
              System
            </p>
            {systemNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-surface)]'
                    }
                  `}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 blur-xl`} />
                  )}
                  <item.icon className={`w-4 h-4 relative z-10 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                  <span className="font-medium text-sm relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Main Navigation Section */}
          <div className="mb-4">
            <p className="px-4 py-2 text-xs font-medium text-[var(--text-ghost)] uppercase tracking-wider">
              Workspace
            </p>
            {filteredNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-surface)]'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Glow effect for active */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 blur-xl`} />
                  )}
                  
                  <item.icon className={`w-5 h-5 relative z-10 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                  <span className="font-medium relative z-10">{item.name}</span>
                  
                  {/* Hover indicator */}
                  {!isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-8 bg-gradient-to-b ${item.gradient} rounded-r-full transition-all duration-300`} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Trust Section */}
          <div>
            <p className="px-4 py-2 text-xs font-medium text-[var(--text-ghost)] uppercase tracking-wider">
              Transparency
            </p>
            {trustNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-surface)]'
                    }
                  `}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 blur-xl`} />
                  )}
                  <item.icon className={`w-4 h-4 relative z-10 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                  <span className="font-medium text-sm relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-[var(--border-subtle)] space-y-2">
          <Link
            to="/settings"
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${location.pathname === '/settings'
                ? 'bg-[var(--void-surface)] text-white'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-surface)]'
              }
            `}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--cosmic-red)] hover:bg-[var(--cosmic-red)]/10 transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border-subtle)] flex items-center justify-between px-6 bg-[var(--void-deep)]/60 backdrop-blur-xl">
          {/* Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search knowledge, tasks, decisions..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full pl-11 pr-20 py-2.5 bg-[var(--void-surface)] border border-[var(--border-subtle)] rounded-xl text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] focus:ring-2 focus:ring-[var(--cosmic-cyan)]/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-[var(--void-elevated)] rounded-md border border-[var(--border-subtle)]">
                <Command className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">K</span>
              </div>
              
              {searchFocused && (
                <div className="absolute inset-0 -z-10 bg-[var(--cosmic-cyan)] rounded-xl blur-xl opacity-10" />
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* System Health */}
            <SystemHealthIndicator variant="compact" />
            
            {/* Mode Indicator */}
            <ModeIndicator showUpgradeHint={true} />

            {/* Role Badge */}
            <span className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${getRoleBadgeStyle(userRole)}`}>
              {userRole}
            </span>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--void-elevated)] transition-all group">
              <Bell className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-white transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--cosmic-cyan)] rounded-full animate-pulse" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--void-elevated)] transition-all"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--cosmic-purple)] to-[var(--cosmic-magenta)] flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium text-white hidden sm:block">{user?.name?.split(' ')[0]}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--void-elevated)] rounded-xl border border-[var(--border-default)] shadow-2xl z-50 overflow-hidden animate-slide-up">
                  <div className="p-4 border-b border-[var(--border-subtle)]">
                    <p className="text-white font-medium">{user?.name}</p>
                    <p className="text-[var(--text-muted)] text-sm">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-float)] rounded-lg transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--cosmic-red)] hover:bg-[var(--cosmic-red)]/10 rounded-lg transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>

      {/* Trust Button (floating) */}
      <TrustButton />
    </div>
  );
}
