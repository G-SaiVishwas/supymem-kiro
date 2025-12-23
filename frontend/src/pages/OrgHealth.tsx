import { useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Trophy,
  Target,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgHealth } from '../contexts/SystemStateContext';
import { AnimatedCounter } from '../components/effects';
import type { RiskHotspot, OrgWin } from '../types';

export default function OrgHealth() {
  const { orgHealth, isLoading, refresh } = useOrgHealth();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTrendIcon = (trend: 'up' | 'stable' | 'down') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: 'up' | 'stable' | 'down') => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  if (isLoading && !orgHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[var(--cosmic-cyan)] animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Loading org health...</p>
        </div>
      </div>
    );
  }

  if (!orgHealth) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-[var(--text-ghost)] mx-auto mb-3" />
        <p className="text-[var(--text-muted)]">Unable to load organization health data</p>
        <button
          onClick={refresh}
          className="mt-4 text-[var(--cosmic-cyan)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Organization Health</h1>
              <p className="text-[var(--text-muted)]">Your north-star view of organizational alignment</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alignment Score */}
        <HealthGauge
          title="Alignment"
          description="How well activities align with intents"
          score={orgHealth.alignment_score}
          trend={orgHealth.alignment_trend}
          icon={Target}
        />
        
        {/* Decision Stability */}
        <HealthGauge
          title="Decision Stability"
          description="Consistency of decision-making"
          score={orgHealth.decision_stability}
          trend={orgHealth.decision_stability_trend}
          icon={Activity}
        />
        
        {/* Execution Confidence */}
        <HealthGauge
          title="Execution Confidence"
          description="Trust in task completion"
          score={orgHealth.execution_confidence}
          trend={orgHealth.execution_confidence_trend}
          icon={TrendingUp}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Hotspots */}
        <div className="glass-elevated rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Risk Hotspots
            </h2>
            {orgHealth.risk_hotspots.length === 0 && (
              <span className="text-xs text-green-400 px-2 py-1 rounded-full bg-green-500/20">
                All clear
              </span>
            )}
          </div>

          {orgHealth.risk_hotspots.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-[var(--text-secondary)]">No risk hotspots detected</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your organization is running smoothly
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orgHealth.risk_hotspots.map(hotspot => (
                <RiskHotspotCard key={hotspot.id} hotspot={hotspot} />
              ))}
            </div>
          )}
        </div>

        {/* Wins */}
        <div className="glass-elevated rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Wins This Week
            </h2>
          </div>

          {orgHealth.wins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)]">No wins recorded yet this week</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orgHealth.wins.map(win => (
                <WinCard key={win.id} win={win} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/system-map"
          className="glass rounded-xl p-4 hover-glow group transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white group-hover:text-[var(--cosmic-cyan)]">View System Map</h3>
              <p className="text-sm text-[var(--text-muted)]">See causal relationships</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--cosmic-cyan)] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        
        <Link
          to="/intents"
          className="glass rounded-xl p-4 hover-glow group transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white group-hover:text-[var(--cosmic-cyan)]">Manage Intents</h3>
              <p className="text-sm text-[var(--text-muted)]">Define goals and constraints</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--cosmic-cyan)] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        
        <Link
          to="/decisions"
          className="glass rounded-xl p-4 hover-glow group transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white group-hover:text-[var(--cosmic-cyan)]">Review Decisions</h3>
              <p className="text-sm text-[var(--text-muted)]">Check stability factors</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--cosmic-cyan)] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Last updated */}
      <p className="text-xs text-[var(--text-ghost)] text-center">
        Last updated: {new Date(orgHealth.last_updated).toLocaleString()}
      </p>
    </div>
  );
}

interface HealthGaugeProps {
  title: string;
  description: string;
  score: number;
  trend: 'up' | 'stable' | 'down';
  icon: typeof Activity;
}

function HealthGauge({ title, description, score, trend, icon: Icon }: HealthGaugeProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const getGradient = () => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getTrendColorClass = () => {
    if (trend === 'up') return 'text-green-400 bg-green-500/20';
    if (trend === 'down') return 'text-red-400 bg-red-500/20';
    return 'text-[var(--text-muted)] bg-[var(--void-surface)]';
  };

  return (
    <div className="glass-elevated rounded-2xl p-6 relative overflow-hidden group">
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient()} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getTrendColorClass()}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-xs font-medium">{trend}</span>
          </div>
        </div>

        {/* Score */}
        <div className="mb-2">
          <span className={`text-5xl font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            <AnimatedCounter value={score} duration={1200} />
          </span>
          <span className="text-2xl text-[var(--text-muted)]">%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--void-surface)] overflow-hidden mb-3">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-1000`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Labels */}
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}

function RiskHotspotCard({ hotspot }: { hotspot: RiskHotspot }) {
  const severityConfig = {
    low: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };

  const config = severityConfig[hotspot.severity];

  return (
    <div className={`p-4 rounded-xl ${config.bg} border ${config.border}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white">{hotspot.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {hotspot.severity}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{hotspot.description}</p>
          
          {hotspot.related_entities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {hotspot.related_entities.slice(0, 3).map(entity => (
                <span 
                  key={entity.id}
                  className="text-xs px-2 py-0.5 rounded bg-[var(--void-surface)] text-[var(--text-muted)]"
                >
                  {entity.title}
                </span>
              ))}
              {hotspot.related_entities.length > 3 && (
                <span className="text-xs text-[var(--text-muted)]">
                  +{hotspot.related_entities.length - 3} more
                </span>
              )}
            </div>
          )}
          
          {hotspot.suggested_action && (
            <p className="text-xs text-[var(--cosmic-cyan)] mt-2">
              💡 {hotspot.suggested_action}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WinCard({ win }: { win: OrgWin }) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h4 className="font-medium text-white">{win.title}</h4>
          <p className="text-sm text-[var(--text-muted)]">{win.description}</p>
          <p className="text-xs text-[var(--text-ghost)] mt-1">
            {new Date(win.achieved_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

