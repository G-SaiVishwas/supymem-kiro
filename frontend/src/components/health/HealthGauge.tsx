import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnimatedCounter } from '../effects';

interface HealthGaugeProps {
  title: string;
  score: number;
  trend: 'up' | 'stable' | 'down';
  icon: React.ElementType;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

export function HealthGauge({ 
  title, 
  score, 
  trend, 
  icon: Icon,
  size = 'md',
  showTrend = true,
  className = '' 
}: HealthGaugeProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const getGradient = () => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400 bg-green-500/20';
    if (trend === 'down') return 'text-red-400 bg-red-500/20';
    return 'text-[var(--text-muted)] bg-[var(--void-surface)]';
  };

  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      score: 'text-2xl',
      progress: 'h-1',
    },
    md: {
      container: 'p-4',
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      score: 'text-3xl',
      progress: 'h-1.5',
    },
    lg: {
      container: 'p-6',
      icon: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      score: 'text-4xl',
      progress: 'h-2',
    },
  };

  const s = sizeClasses[size];

  return (
    <div className={`glass-elevated rounded-2xl ${s.container} relative overflow-hidden group ${className}`}>
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className={`${s.icon} rounded-xl bg-gradient-to-br ${getGradient()} flex items-center justify-center`}>
            <Icon className={`${s.iconInner} text-white`} />
          </div>
          {showTrend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getTrendColor()}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium capitalize">{trend}</span>
            </div>
          )}
        </div>

        {/* Score */}
        <div className="mb-2">
          <span className={`${s.score} font-bold ${getScoreColor()}`}>
            <AnimatedCounter value={score} duration={1200} />
          </span>
          <span className="text-lg text-[var(--text-muted)]">%</span>
        </div>

        {/* Progress bar */}
        <div className={`${s.progress} rounded-full bg-[var(--void-surface)] overflow-hidden mb-2`}>
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-1000`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Title */}
        <h4 className="font-medium text-white text-sm">{title}</h4>
      </div>
    </div>
  );
}

// Mini gauge for inline/compact use
interface MiniGaugeProps {
  score: number;
  label?: string;
  className?: string;
}

export function MiniGauge({ score, label, className = '' }: MiniGaugeProps) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 rounded-full bg-[var(--void-surface)] overflow-hidden">
        <div 
          className={`h-full rounded-full ${getColor()} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--text-secondary)] min-w-[3ch]">
        {score}%
      </span>
      {label && (
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      )}
    </div>
  );
}

export default HealthGauge;

