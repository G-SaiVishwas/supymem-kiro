import { useState } from 'react';
import { 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  ChevronDown, 
  RefreshCw,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { useSystemHealth } from '../../contexts/SystemStateContext';
import type { SystemStatus, HealthCheck } from '../../types';

const STATUS_CONFIG: Record<SystemStatus, {
  label: string;
  icon: typeof Check;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  healthy: {
    label: 'All Clear',
    icon: Check,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  attention_needed: {
    label: 'Needs Attention',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
  },
  issues_detected: {
    label: 'Issues Detected',
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
};

interface SystemHealthIndicatorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function SystemHealthIndicator({ variant = 'compact', className = '' }: SystemHealthIndicatorProps) {
  const { health, isLoading, refresh } = useSystemHealth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!health && !isLoading) {
    return null;
  }

  const status = health?.overall_status || 'healthy';
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg
            ${config.bgColor} ${config.borderColor} border
            hover:brightness-110 transition-all
            ${isExpanded ? 'shadow-lg ' + config.glowColor : ''}
          `}
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
          ) : (
            <Icon className={`w-4 h-4 ${config.color}`} />
          )}
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          {health?.attention_count ? (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${config.bgColor} ${config.color}`}>
              {health.attention_count}
            </span>
          ) : null}
          <ChevronDown className={`w-3 h-3 ${config.color} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded dropdown */}
        {isExpanded && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-80 p-4 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] shadow-2xl z-50">
              <HealthCheckList health={health} onRefresh={refresh} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`p-6 rounded-2xl glass-elevated ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              System Status
              {health?.attention_count ? (
                <span className={`px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}>
                  {health.attention_count} items
                </span>
              ) : null}
            </h3>
            <p className={`text-sm ${config.color}`}>{config.label}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-[var(--void-elevated)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--text-muted)] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <HealthCheckList health={health} onRefresh={refresh} isLoading={isLoading} />
    </div>
  );
}

interface HealthCheckListProps {
  health: ReturnType<typeof useSystemHealth>['health'];
  onRefresh: () => void;
  isLoading: boolean;
}

function HealthCheckList({ health, isLoading }: HealthCheckListProps) {
  if (isLoading && !health) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 rounded-lg skeleton" />
        ))}
      </div>
    );
  }

  if (!health?.checks) {
    return (
      <p className="text-sm text-[var(--text-muted)]">No health data available</p>
    );
  }

  return (
    <div className="space-y-2">
      {health.checks.map(check => (
        <HealthCheckItem key={check.id} check={check} />
      ))}
      <p className="text-xs text-[var(--text-ghost)] mt-3 text-right">
        Last checked: {new Date(health.last_checked).toLocaleTimeString()}
      </p>
    </div>
  );
}

interface HealthCheckItemProps {
  check: HealthCheck;
}

export function HealthCheckItem({ check }: HealthCheckItemProps) {
  const statusConfig = {
    ok: {
      icon: Check,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  };

  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <div 
      className={`
        flex items-center gap-3 p-3 rounded-lg
        ${config.bgColor} border border-transparent
        ${check.action_url ? 'cursor-pointer hover:border-[var(--border-default)]' : ''}
        transition-all
      `}
      onClick={() => check.action_url && window.open(check.action_url, '_blank')}
    >
      <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{check.name}</p>
        {check.details && (
          <p className="text-xs text-[var(--text-muted)] truncate">{check.details}</p>
        )}
      </div>
      {check.action_url && (
        <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
      )}
    </div>
  );
}

// Minimal status dot for header/sidebar use
interface StatusDotProps {
  className?: string;
}

export function StatusDot({ className = '' }: StatusDotProps) {
  const { health } = useSystemHealth();
  
  if (!health) return null;
  
  const config = STATUS_CONFIG[health.overall_status];
  
  return (
    <div 
      className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} ${className}`}
      title={config.label}
    />
  );
}

// Dashboard widget showing positive system state
export function HealthySystemWidget({ className = '' }: { className?: string }) {
  const { health, isLoading } = useSystemHealth();

  if (isLoading) {
    return (
      <div className={`p-6 rounded-2xl glass animate-pulse ${className}`}>
        <div className="h-6 w-32 skeleton rounded mb-2" />
        <div className="h-4 w-48 skeleton rounded" />
      </div>
    );
  }

  if (!health || health.overall_status !== 'healthy') {
    return null; // Only show when healthy
  }

  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">All Systems Operational</h3>
          <p className="text-sm text-green-400">Everything is running smoothly</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {health.checks.slice(0, 4).map(check => (
          <div 
            key={check.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10"
          >
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-300 truncate">{check.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemHealthIndicator;

