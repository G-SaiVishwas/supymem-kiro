import { User, Bot, Check, X, Lightbulb, Zap } from 'lucide-react';
import type { AgentType, ActionType } from '../../types';
import { useTrust } from '../../contexts/TrustContext';

interface AgencyBadgeProps {
  agentType: AgentType;
  actionType: ActionType;
  agentName?: string;
  timestamp?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AGENT_CONFIG: Record<AgentType, { icon: typeof User; baseColor: string }> = {
  human: {
    icon: User,
    baseColor: 'cyan',
  },
  ai: {
    icon: Bot,
    baseColor: 'purple',
  },
};

const ACTION_CONFIG: Record<ActionType, {
  label: string;
  icon: typeof Check;
  suffix: string;
}> = {
  initiated: {
    label: 'Initiated',
    icon: Zap,
    suffix: 'started this',
  },
  proposed: {
    label: 'Proposed',
    icon: Lightbulb,
    suffix: 'suggested this',
  },
  executed: {
    label: 'Executed',
    icon: Zap,
    suffix: 'executed this',
  },
  approved: {
    label: 'Approved',
    icon: Check,
    suffix: 'approved this',
  },
  rejected: {
    label: 'Rejected',
    icon: X,
    suffix: 'rejected this',
  },
  overridden: {
    label: 'Overridden',
    icon: X,
    suffix: 'overrode this',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
  },
};

export function AgencyBadge({
  agentType,
  actionType,
  agentName,
  timestamp,
  showLabel = true,
  size = 'md',
  className = '',
}: AgencyBadgeProps) {
  const { showAgencyBadges } = useTrust();
  
  if (!showAgencyBadges) return null;
  
  const agentConfig = AGENT_CONFIG[agentType];
  const actionConfig = ACTION_CONFIG[actionType];
  const sizeConfig = SIZE_CONFIG[size];
  
  const AgentIcon = agentConfig.icon;
  const ActionIcon = actionConfig.icon;
  
  const colorClasses = agentType === 'human'
    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
    : 'bg-purple-500/10 border-purple-500/30 text-purple-400';

  const getLabel = () => {
    const agent = agentType === 'human' ? (agentName || 'Human') : 'AI';
    return `${agent} ${actionConfig.label.toLowerCase()}`;
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-medium border
        ${colorClasses}
        ${sizeConfig.badge}
        ${className}
      `}
      title={`${getLabel()}${timestamp ? ` at ${new Date(timestamp).toLocaleString()}` : ''}`}
    >
      <div className="flex items-center gap-0.5">
        <AgentIcon className={sizeConfig.icon} />
        <ActionIcon className={`${sizeConfig.icon} opacity-70`} />
      </div>
      {showLabel && (
        <span className="truncate max-w-[120px]">
          {getLabel()}
        </span>
      )}
    </div>
  );
}

// Compact icon-only version
interface AgencyIconProps {
  agentType: AgentType;
  actionType?: ActionType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AgencyIcon({ agentType, actionType, size = 'md', className = '' }: AgencyIconProps) {
  const { showAgencyBadges } = useTrust();
  
  if (!showAgencyBadges) return null;
  
  const agentConfig = AGENT_CONFIG[agentType];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = agentConfig.icon;
  
  const colorClass = agentType === 'human' ? 'text-cyan-400' : 'text-purple-400';
  const bgClass = agentType === 'human' ? 'bg-cyan-500/10' : 'bg-purple-500/10';
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full
        ${bgClass} ${sizeClasses[size]} ${className}
      `}
      title={`${agentType === 'human' ? 'Human' : 'AI'}${actionType ? ` ${actionType}` : ''}`}
    >
      <Icon className={`${sizeConfig.icon} ${colorClass}`} />
    </div>
  );
}

// Legend component for explaining badges
export function AgencyLegend({ className = '' }: { className?: string }) {
  const items: { agentType: AgentType; actionType: ActionType; description: string }[] = [
    { agentType: 'human', actionType: 'initiated', description: 'Started by a person' },
    { agentType: 'ai', actionType: 'proposed', description: 'Suggested by AI' },
    { agentType: 'ai', actionType: 'executed', description: 'Automatically done by AI' },
    { agentType: 'human', actionType: 'approved', description: 'Reviewed and approved' },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-[var(--text-secondary)]">
        Agency Indicators
      </h4>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={`${item.agentType}-${item.actionType}`} className="flex items-center gap-2">
            <AgencyBadge
              agentType={item.agentType}
              actionType={item.actionType}
              size="sm"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {item.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline item with agency
interface AgencyTimelineItemProps {
  agentType: AgentType;
  actionType: ActionType;
  agentName?: string;
  content: string;
  timestamp: string;
}

export function AgencyTimelineItem({
  agentType,
  actionType,
  agentName,
  content,
  timestamp,
}: AgencyTimelineItemProps) {
  const agentConfig = AGENT_CONFIG[agentType];
  const Icon = agentConfig.icon;
  
  const borderColor = agentType === 'human' ? 'border-cyan-500' : 'border-purple-500';
  const iconBg = agentType === 'human' ? 'bg-cyan-500' : 'bg-purple-500';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className={`flex-1 w-0.5 ${borderColor} opacity-30`} />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">
            {agentType === 'human' ? (agentName || 'Someone') : 'AI'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {ACTION_CONFIG[actionType].suffix}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{content}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {new Date(timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default AgencyBadge;

