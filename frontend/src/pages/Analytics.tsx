import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, GitCommit, GitPullRequest, CheckCircle, Code } from 'lucide-react';
import { getUserProductivity, getTeamProductivity, getActivities } from '../api/client';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function StatCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  trend?: 'increasing' | 'stable' | 'decreasing';
  icon: React.ElementType;
}) {
  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus;
  const trendColor = trend === 'increasing' ? 'text-green-400' : trend === 'decreasing' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="flex items-center gap-2">
          {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
          <Icon className="w-6 h-6 text-[var(--color-accent)]" />
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [selectedUser, setSelectedUser] = useState('');
  const [timeRange, setTimeRange] = useState(7);

  const { data: teamData } = useQuery({
    queryKey: ['teamProductivity', timeRange],
    queryFn: () => getTeamProductivity(undefined, timeRange),
  });

  const { data: userData } = useQuery({
    queryKey: ['userProductivity', selectedUser, timeRange],
    queryFn: () => getUserProductivity(selectedUser || teamData?.user_rankings[0]?.user || 'unknown', undefined, timeRange),
    enabled: !!teamData?.user_rankings?.length,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', selectedUser],
    queryFn: () => getActivities(selectedUser || teamData?.user_rankings[0]?.user || 'unknown'),
    enabled: !!teamData?.user_rankings?.length,
  });

  // Prepare chart data
  const activityTypeData = activities.reduce((acc: any[], activity) => {
    const existing = acc.find((a) => a.name === activity.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: activity.type, value: 1 });
    }
    return acc;
  }, []);

  // Mock daily data for chart
  const dailyData = [
    { day: 'Mon', commits: 5, prs: 1, tasks: 3 },
    { day: 'Tue', commits: 8, prs: 2, tasks: 4 },
    { day: 'Wed', commits: 6, prs: 1, tasks: 2 },
    { day: 'Thu', commits: 12, prs: 3, tasks: 5 },
    { day: 'Fri', commits: 10, prs: 2, tasks: 4 },
    { day: 'Sat', commits: 3, prs: 0, tasks: 1 },
    { day: 'Sun', commits: 2, prs: 0, tasks: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Track team and individual productivity</p>
        </div>
        <div className="flex items-center gap-3">
          {teamData?.user_rankings && teamData.user_rankings.length > 0 && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">Select User</option>
              {teamData.user_rankings.map((u) => (
                <option key={u.user} value={u.user}>
                  {u.user}
                </option>
              ))}
            </select>
          )}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Commits"
          value={teamData?.totals.total_commits || 0}
          trend="increasing"
          icon={GitCommit}
        />
        <StatCard
          title="PRs Merged"
          value={teamData?.totals.total_prs_merged || 0}
          trend="stable"
          icon={GitPullRequest}
        />
        <StatCard
          title="Tasks Completed"
          value={teamData?.totals.total_tasks_completed || 0}
          trend="increasing"
          icon={CheckCircle}
        />
        <StatCard
          title="Avg Productivity"
          value={teamData?.totals.average_productivity.toFixed(1) || 0}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorCommits2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a2234',
                    border: '1px solid #2a3548',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="commits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCommits2)" />
                <Area type="monotone" dataKey="tasks" stroke="#10b981" fillOpacity={0.3} fill="#10b98130" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Activity Breakdown</h2>
          <div className="h-64">
            {activityTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {activityTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2234',
                      border: '1px solid #2a3548',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                No activity data
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {activityTypeData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-[var(--color-text-muted)]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Stats */}
      {userData && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">
              {userData.user_identifier}'s Productivity
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold gradient-text">{userData.productivity_score.toFixed(1)}</span>
              <span className="text-[var(--color-text-muted)]">score</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{userData.commits}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Commits</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{userData.prs_merged}</p>
              <p className="text-xs text-[var(--color-text-muted)]">PRs Merged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{userData.tasks_completed}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Tasks Done</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{userData.prs_reviewed}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Reviews</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{userData.lines_added}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Lines Added</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-400">{userData.decisions_made}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Decisions</p>
            </div>
          </div>
          {userData.most_active_day && (
            <p className="text-center text-[var(--color-text-muted)] mt-4">
              Most active on <span className="text-[var(--color-accent)]">{userData.most_active_day}s</span>
            </p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {teamData?.user_rankings && teamData.user_rankings.length > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Team Leaderboard</h2>
          <div className="space-y-3">
            {teamData.user_rankings.map((user, idx) => (
              <div
                key={user.user}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                onClick={() => setSelectedUser(user.user)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : idx === 1
                      ? 'bg-gray-400/20 text-gray-300'
                      : idx === 2
                      ? 'bg-amber-600/20 text-amber-500'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user.user}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                    <span>{user.commits} commits</span>
                    <span>{user.prs_merged} PRs</span>
                    <span>{user.tasks_completed} tasks</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--color-accent)]">{user.productivity_score.toFixed(1)}</p>
                  <div className="flex items-center justify-end gap-1">
                    {user.trend === 'increasing' && <TrendingUp className="w-3 h-3 text-green-400" />}
                    {user.trend === 'decreasing' && <TrendingDown className="w-3 h-3 text-red-400" />}
                    {user.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
                    <span className="text-xs text-[var(--color-text-muted)]">{user.trend}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

