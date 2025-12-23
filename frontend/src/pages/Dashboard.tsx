import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  ArrowRight,
  Sparkles,
  Activity,
  Github,
  Brain,
  RefreshCw,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { getTeamProductivity, getTasks, getAutomationRules, searchKnowledge, getTeamActivities, getGitHubEvents, getFullDecisions, type GitHubEvent, type FullDecision } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedCounter } from '../components/effects';
import { ExportButton } from '../components/export';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const chartData = [
  { day: 'Mon', commits: 12, prs: 3, tasks: 5 },
  { day: 'Tue', commits: 18, prs: 5, tasks: 8 },
  { day: 'Wed', commits: 15, prs: 4, tasks: 6 },
  { day: 'Thu', commits: 22, prs: 7, tasks: 10 },
  { day: 'Fri', commits: 20, prs: 6, tasks: 9 },
  { day: 'Sat', commits: 8, prs: 2, tasks: 3 },
  { day: 'Sun', commits: 5, prs: 1, tasks: 2 },
];

// Format timestamp to IST (Indian Standard Time)
function formatToIST(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

function StatCard({ title, value, change, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  const isPositive = change && change > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div 
      className="glass-elevated rounded-2xl p-6 relative overflow-hidden group hover-glow animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      
      {/* Icon */}
      <div className={`absolute top-4 right-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <div className="relative">
        <p className="text-[var(--text-muted)] text-sm font-medium">{title}</p>
        <p className="text-4xl font-bold mt-2 text-white tracking-tight">
          <AnimatedCounter value={value} duration={1200} />
        </p>
        
        {change !== undefined && (
          <div className={`flex items-center gap-1.5 mt-3 ${isPositive ? 'text-[var(--cosmic-green)]' : 'text-[var(--cosmic-red)]'}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
            <span className="text-[var(--text-muted)] text-sm">from last week</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickActionProps {
  to: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  gradient: string;
  delay?: number;
}

function QuickAction({ to, icon: Icon, title, subtitle, gradient, delay = 0 }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="glass rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated border */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} style={{ padding: '1px' }}>
        <div className="absolute inset-[1px] bg-[var(--void-surface)] rounded-2xl" />
      </div>
      
      <div className="relative flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white group-hover:text-[var(--cosmic-cyan)] transition-colors">{title}</h3>
          <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--cosmic-cyan)] group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

function LeaderboardItem({
  rank,
  user,
  score,
  trend,
}: {
  rank: number;
  user: string;
  score: number;
  trend: string;
}) {
  const isIncreasing = trend === 'increasing';
  const TrendIcon = isIncreasing ? TrendingUp : TrendingDown;

  const rankStyles = [
    'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30',
    'bg-gradient-to-br from-slate-300 to-slate-400 text-black shadow-lg shadow-slate-400/30',
    'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-amber-600/30',
  ];

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--void-surface)] transition-all duration-200 group">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
          rank <= 3 ? rankStyles[rank - 1] : 'bg-[var(--void-surface)] text-[var(--text-muted)]'
        }`}
      >
        {rank}
      </div>
      <div className="flex-1">
        <p className="font-medium text-white">{user}</p>
        <p className="text-sm text-[var(--text-muted)]">
          Score: <AnimatedCounter value={score} decimals={1} />
        </p>
      </div>
      <TrendIcon className={`w-4 h-4 ${isIncreasing ? 'text-[var(--cosmic-green)]' : 'text-[var(--cosmic-red)]'}`} />
    </div>
  );
}

export default function Dashboard() {
  const { user, currentOrg } = useAuth();
  const userRole = currentOrg?.role || 'member';
  const isManager = ['owner', 'admin', 'manager'].includes(userRole);
  
  const { data: teamData } = useQuery({
    queryKey: ['teamProductivity'],
    queryFn: () => getTeamProductivity(),
    enabled: isManager,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  });

  const { data: automationRules } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => getAutomationRules(),
  });

  const { data: knowledgeData } = useQuery({
    queryKey: ['knowledgeCount'],
    queryFn: () => searchKnowledge('*'),
  });

  const { data: activities } = useQuery({
    queryKey: ['teamActivities'],
    queryFn: () => getTeamActivities(),
    enabled: isManager,
  });

  // GitHub Integration Demo queries
  const { data: githubEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['githubEvents'],
    queryFn: () => getGitHubEvents(undefined, 10),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: fullDecisions, isLoading: decisionsLoading, refetch: refetchDecisions } = useQuery({
    queryKey: ['fullDecisions'],
    queryFn: () => getFullDecisions(undefined, 10),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const myTasks = tasks?.filter((t) => t.assigned_to === user?.email) || [];
  const myPendingTasks = myTasks.filter((t) => t.status === 'pending').length;
  const myInProgressTasks = myTasks.filter((t) => t.status === 'in_progress').length;
  const myCompletedTasks = myTasks.filter((t) => t.status === 'completed').length;
  
  const pendingTasks = tasks?.filter((t) => t.status === 'pending').length || 0;
  const activeRules = automationRules?.filter((r) => r.status === 'active').length || 0;
  const knowledgeCount = knowledgeData?.results?.length || 0;
  
  const activeUsers = new Set(activities?.map((a) => a.user)).size || 0;
  const commits = activities?.filter((a) => a.type === 'commit').length || 0;
  const prsMerged = activities?.filter((a) => a.type === 'pr_merged').length || 0;
  const tasksCompleted = activities?.filter((a) => a.type === 'task_completed').length || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDescription = () => {
    const descriptions: { [key: string]: string } = {
      owner: "Full control • All permissions enabled",
      admin: "Manage users, settings, and content",
      manager: "Manage team tasks and view analytics",
      member: "Contribute to knowledge and tasks",
      viewer: "Read-only access to content",
    };
    return descriptions[userRole] || descriptions.member;
  };

  const getRoleBadgeStyle = () => {
    const styles: { [key: string]: string } = {
      owner: 'from-purple-500 to-pink-500',
      admin: 'from-red-500 to-orange-500',
      manager: 'from-green-500 to-emerald-500',
      member: 'from-cyan-500 to-blue-500',
      viewer: 'from-slate-500 to-gray-500',
    };
    return styles[userRole] || styles.member;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-aurora rounded-3xl p-8 relative overflow-hidden animate-slide-up">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--cosmic-cyan)] rounded-full blur-[150px] opacity-10" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[var(--cosmic-purple)] rounded-full blur-[120px] opacity-10" />
        
        <div className="relative flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[var(--cosmic-cyan)]" />
              <span className="text-[var(--text-muted)] text-sm font-medium">Welcome back</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>!
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">{getRoleDescription()}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <ExportButton variant="secondary" />
            <div className={`px-6 py-3 rounded-2xl bg-gradient-to-r ${getRoleBadgeStyle()} shadow-lg animate-float`}>
              <span className="text-white font-semibold text-lg capitalize">{userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Integration Demo Section */}
      <div className="glass-aurora rounded-3xl p-6 relative overflow-hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#238636] rounded-full blur-[120px] opacity-10" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">GitHub Integration Demo</h2>
                <p className="text-sm text-[var(--text-muted)]">Real-time webhook events & extracted decisions</p>
              </div>
            </div>
            <button
              onClick={() => { refetchEvents(); refetchDecisions(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--void-surface)] hover:bg-[var(--void-deeper)] transition-colors text-[var(--text-secondary)]"
            >
              <RefreshCw className={`w-4 h-4 ${eventsLoading || decisionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GitHub Events */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Webhook Events
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {githubEvents && githubEvents.length > 0 ? (
                  githubEvents.map((event: GitHubEvent) => (
                    <div key={event.id} className="glass rounded-xl p-4 hover:bg-[var(--void-surface)] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            event.event_type === 'push' ? 'bg-green-500/20 text-green-400' :
                            event.event_type === 'pull_request' ? 'bg-purple-500/20 text-purple-400' :
                            event.event_type === 'issues' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {event.event_type === 'push' ? <GitCommit className="w-4 h-4" /> :
                             event.event_type === 'pull_request' ? <GitPullRequest className="w-4 h-4" /> :
                             <MessageSquare className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">
                              {event.event_type}
                              {event.action && <span className="text-[var(--text-muted)]"> · {event.action}</span>}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {event.repository} {event.sender && `by ${event.sender}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.processed && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                              Processed
                            </span>
                          )}
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatToIST(event.created_at)} IST
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Github className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No GitHub events yet</p>
                    <p className="text-sm mt-1">Push a commit or create a PR to see events here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Decisions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Extracted Decisions & Reasoning
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {fullDecisions && fullDecisions.length > 0 ? (
                  fullDecisions.map((decision: FullDecision) => (
                    <div key={decision.id} className="glass rounded-xl p-4 hover:bg-[var(--void-surface)] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{decision.title}</p>
                          {decision.reasoning && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {decision.reasoning}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {decision.category && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
                                {decision.category}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              decision.importance === 'critical' ? 'bg-red-500/20 text-red-400' :
                              decision.importance === 'high' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {decision.importance}
                            </span>
                            {decision.source_url && (
                              <a
                                href={decision.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--cosmic-cyan)] hover:underline text-xs flex items-center gap-1"
                              >
                                View Source <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
                            <div className="mt-2 p-2 rounded-lg bg-[var(--void-deeper)]">
                              <p className="text-xs text-[var(--text-muted)] mb-1">Alternatives considered:</p>
                              {decision.alternatives_considered.slice(0, 2).map((alt, idx) => (
                                <p key={idx} className="text-xs text-[var(--text-secondary)]">
                                  • {alt.option} {alt.rejected_reason && `- ${alt.rejected_reason}`}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No decisions extracted yet</p>
                    <p className="text-sm mt-1">Make a commit with decision reasoning to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          to="/ask"
          icon={MessageSquare}
          title="Ask Agent"
          subtitle="Query knowledge base"
          gradient="from-purple-500 to-pink-500"
          delay={50}
        />
        <QuickAction
          to="/tasks"
          icon={CheckCircle}
          title="My Tasks"
          subtitle={`${myPendingTasks} pending`}
          gradient="from-cyan-500 to-blue-500"
          delay={100}
        />
        <QuickAction
          to="/automations"
          icon={Zap}
          title="Automations"
          subtitle={`${activeRules} active`}
          gradient="from-amber-500 to-orange-500"
          delay={150}
        />
        <QuickAction
          to={isManager ? "/analytics" : "/decisions"}
          icon={isManager ? BarChart3 : GitPullRequest}
          title={isManager ? "Analytics" : "Decisions"}
          subtitle={isManager ? "Team insights" : "Past decisions"}
          gradient="from-green-500 to-emerald-500"
          delay={200}
        />
      </div>

      {/* My Task Summary */}
      <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-[var(--cosmic-cyan)]" />
          <h2 className="text-xl font-bold text-white">My Task Summary</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl border border-amber-500/20">
            <p className="text-4xl font-bold text-amber-400">
              <AnimatedCounter value={myPendingTasks} />
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">Pending</p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-2xl border border-cyan-500/20">
            <p className="text-4xl font-bold text-cyan-400">
              <AnimatedCounter value={myInProgressTasks} />
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">In Progress</p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-2xl border border-green-500/20">
            <p className="text-4xl font-bold text-green-400">
              <AnimatedCounter value={myCompletedTasks} />
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-2 font-medium">Completed</p>
          </div>
        </div>
      </div>

      {/* Team Overview - Manager+ Only */}
      {isManager && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Commits"
              value={teamData?.totals?.total_commits || commits}
              change={12}
              icon={GitCommit}
              gradient="from-cyan-500 to-blue-500"
              delay={300}
            />
            <StatCard
              title="PRs Merged"
              value={teamData?.totals?.total_prs_merged || prsMerged}
              change={8}
              icon={GitPullRequest}
              gradient="from-purple-500 to-violet-500"
              delay={350}
            />
            <StatCard
              title="Tasks Completed"
              value={teamData?.totals?.total_tasks_completed || tasksCompleted}
              change={-5}
              icon={CheckCircle}
              gradient="from-green-500 to-emerald-500"
              delay={400}
            />
            <StatCard
              title="Active Users"
              value={teamData?.active_users || activeUsers}
              icon={Users}
              gradient="from-amber-500 to-orange-500"
              delay={450}
            />
          </div>

          {/* Charts and Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Chart */}
            <div className="lg:col-span-2 glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Activity className="w-5 h-5 text-[var(--cosmic-cyan)]" />
                Team Activity
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPRs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="#5c5c6e"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#5c5c6e"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1c28',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                      itemStyle={{ color: '#9898a8' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="commits"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCommits)"
                    />
                    <Area
                      type="monotone"
                      dataKey="prs"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPRs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '550ms' }}>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[var(--cosmic-purple)]" />
                Top Contributors
              </h2>
              <div className="space-y-2">
                {teamData?.user_rankings?.slice(0, 5).map((userData: any, idx: number) => (
                  <LeaderboardItem
                    key={userData.user}
                    rank={idx + 1}
                    user={userData.user}
                    score={userData.productivity_score}
                    trend={userData.trend}
                  />
                )) || (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <p>No data available yet</p>
                    <p className="text-sm mt-1">Start tracking to see results</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Stats for Everyone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          to="/tasks" 
          className="glass rounded-2xl p-6 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: '600ms' }}
        >
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Team Pending Tasks
          </h3>
          <p className="text-4xl font-bold text-[var(--cosmic-cyan)]">
            <AnimatedCounter value={pendingTasks} />
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">tasks awaiting action</p>
        </Link>
        
        <Link 
          to="/automations" 
          className="glass rounded-2xl p-6 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: '650ms' }}
        >
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Active Automations
          </h3>
          <p className="text-4xl font-bold text-[var(--cosmic-purple)]">
            <AnimatedCounter value={activeRules} />
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">rules running</p>
        </Link>
        
        <div 
          className="glass rounded-2xl p-6 hover-glow transition-all duration-300 animate-slide-up"
          style={{ animationDelay: '700ms' }}
        >
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            Knowledge Base
          </h3>
          <p className="text-4xl font-bold text-[var(--cosmic-green)]">
            <AnimatedCounter value={knowledgeCount} />
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">entries indexed</p>
        </div>
      </div>
    </div>
  );
}
