import { Info, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import type { ConfidenceLevel, ConfidenceSource } from '../../types';
import { useTrust } from '../../contexts/TrustContext';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number;
  sources?: ConfidenceSource[];
  reasoning?: string;
  lastVerified?: string | null;
  verifiedBy?: string | null;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
}> = {
  low: {
    label: 'Low',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: HelpCircle,
  },
  high: {
    label: 'High',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: Info,
  },
  verified: {
    label: 'Verified',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: CheckCircle,
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

export function ConfidenceBadge({
  level,
  score,
  sources,
  reasoning,
  lastVerified,
  verifiedBy,
  showDetails = false,
  size = 'md',
  className = '',
}: ConfidenceBadgeProps) {
  const { showConfidenceBadges, shouldShowByConfidence } = useTrust();
  
  if (!showConfidenceBadges || !shouldShowByConfidence(level)) {
    return null;
  }
  
  const config = CONFIDENCE_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div
        className={`
          inline-flex items-center rounded-full font-medium
          ${config.bgColor} ${config.borderColor} border
          ${sizeConfig.badge}
        `}
        title={reasoning}
      >
        <Icon className={`${sizeConfig.icon} ${config.color}`} />
        <span className={config.color}>{config.label}</span>
        {score !== undefined && (
          <span className="text-[var(--text-muted)] ml-0.5">
            {score}%
          </span>
        )}
      </div>
      
      {showDetails && (sources || lastVerified) && (
        <div className="mt-2 text-xs text-[var(--text-muted)] space-y-1">
          {sources && sources.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[var(--text-secondary)]">Sources:</span>
              {sources.slice(0, 3).map((source, i) => (
                <SourceTag key={source.id || i} source={source} />
              ))}
              {sources.length > 3 && (
                <span className="text-[var(--text-muted)]">
                  +{sources.length - 3} more
                </span>
              )}
            </div>
          )}
          {lastVerified && (
            <div>
              Last verified: {formatTimeAgo(lastVerified)}
              {verifiedBy && <span className="ml-1">by {verifiedBy}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SourceTagProps {
  source: ConfidenceSource;
}

const SOURCE_ICONS: Record<string, string> = {
  slack: '💬',
  github: '🐙',
  jira: '📋',
  notion: '📝',
  manual: '✏️',
  voice: '🎙️',
  image: '📷',
  document: '📄',
};

export function SourceTag({ source }: SourceTagProps) {
  const icon = SOURCE_ICONS[source.type] || '📎';
  
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--void-surface)] text-[var(--text-secondary)] text-xs"
      title={`${source.name} (${source.relevance_score}% relevant)`}
    >
      <span>{icon}</span>
      <span className="truncate max-w-[80px]">{source.name}</span>
    </span>
  );
}

// Compact confidence indicator for inline use
interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  className?: string;
}

export function ConfidenceIndicator({ level, className = '' }: ConfidenceIndicatorProps) {
  const { showConfidenceBadges } = useTrust();
  
  if (!showConfidenceBadges) return null;
  
  const config = CONFIDENCE_CONFIG[level];
  
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${config.bgColor} ${className}`}
      title={`Confidence: ${config.label}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
    </span>
  );
}

// Confidence bar for visual representation
interface ConfidenceBarProps {
  score: number;
  level?: ConfidenceLevel;
  className?: string;
}

export function ConfidenceBar({ score, level, className = '' }: ConfidenceBarProps) {
  const { showConfidenceBadges } = useTrust();
  
  if (!showConfidenceBadges) return null;
  
  const effectiveLevel = level || (
    score >= 90 ? 'verified' :
    score >= 70 ? 'high' :
    score >= 40 ? 'medium' : 'low'
  );
  
  const config = CONFIDENCE_CONFIG[effectiveLevel];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--void-surface)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.color.replace('text-', 'bg-')}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${config.color}`}>
        {score}%
      </span>
    </div>
  );
}

// Helper function
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default ConfidenceBadge;

