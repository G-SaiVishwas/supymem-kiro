import { useState } from 'react';
import { Eye, Users, Settings, ChevronUp, Lock, Unlock, Sparkles } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import type { UserMode, UpgradeRequirement } from '../../types';

const MODE_CONFIG: Record<UserMode, {
  label: string;
  description: string;
  icon: typeof Eye;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  observer: {
    label: 'Observer',
    description: 'View dashboards and insights',
    icon: Eye,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
  participant: {
    label: 'Participant',
    description: 'Create and manage content',
    icon: Users,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  controller: {
    label: 'Controller',
    description: 'Full system access',
    icon: Settings,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
};

interface ModeIndicatorProps {
  showUpgradeHint?: boolean;
  className?: string;
}

export function ModeIndicator({ showUpgradeHint = true, className = '' }: ModeIndicatorProps) {
  const { currentMode, canUpgradeTo, upgradeRequirements, onboardingState } = useOnboarding();
  const [showDetails, setShowDetails] = useState(false);
  
  const config = MODE_CONFIG[currentMode];
  const Icon = config.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          ${config.bgColor} ${config.borderColor} border
          hover:brightness-110 transition-all
        `}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        {canUpgradeTo && showUpgradeHint && (
          <ChevronUp className="w-3 h-3 text-[var(--cosmic-green)] animate-bounce" />
        )}
      </button>

      {/* Dropdown details */}
      {showDetails && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-72 p-4 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] shadow-2xl z-50">
            <div className="space-y-4">
              {/* Current mode */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="font-medium text-white">{config.label} Mode</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {config.description}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Active for {onboardingState?.days_active || 0} days
                </p>
              </div>

              {/* Mode progression */}
              <div className="flex items-center gap-2">
                {(['observer', 'participant', 'controller'] as UserMode[]).map((mode, i) => {
                  const modeConfig = MODE_CONFIG[mode];
                  const isActive = mode === currentMode;
                  const isUnlocked = 
                    mode === 'observer' || 
                    (mode === 'participant' && currentMode !== 'observer') ||
                    currentMode === 'controller';
                  
                  return (
                    <div key={mode} className="flex items-center gap-2">
                      <div 
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${isActive 
                            ? `${modeConfig.bgColor} ${modeConfig.borderColor} border-2` 
                            : isUnlocked 
                              ? 'bg-[var(--void-elevated)]' 
                              : 'bg-[var(--void-deep)] opacity-50'}
                        `}
                      >
                        {isUnlocked ? (
                          <modeConfig.icon className={`w-4 h-4 ${isActive ? modeConfig.color : 'text-[var(--text-muted)]'}`} />
                        ) : (
                          <Lock className="w-3 h-3 text-[var(--text-muted)]" />
                        )}
                      </div>
                      {i < 2 && (
                        <div 
                          className={`w-6 h-0.5 ${isUnlocked && mode !== currentMode ? 'bg-[var(--cosmic-cyan)]' : 'bg-[var(--void-elevated)]'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Upgrade section */}
              {canUpgradeTo && (
                <ModeUpgradePrompt 
                  targetMode={canUpgradeTo} 
                  requirements={upgradeRequirements}
                  compact
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ModeUpgradePromptProps {
  targetMode: UserMode;
  requirements: UpgradeRequirement[];
  compact?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export function ModeUpgradePrompt({ 
  targetMode, 
  requirements, 
  compact = false,
  onUpgrade,
  className = '' 
}: ModeUpgradePromptProps) {
  const { requestUpgrade, isLoading } = useOnboarding();
  const config = MODE_CONFIG[targetMode];
  const allMet = requirements.every(r => r.completed);

  const handleUpgrade = async () => {
    if (allMet) {
      const success = await requestUpgrade(targetMode);
      if (success && onUpgrade) {
        onUpgrade();
      }
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg bg-[var(--cosmic-green)]/10 border border-[var(--cosmic-green)]/30 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[var(--cosmic-green)]" />
          <span className="text-sm font-medium text-[var(--cosmic-green)]">
            Upgrade Available
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          You can now unlock {config.label} mode!
        </p>
        <button
          onClick={handleUpgrade}
          disabled={!allMet || isLoading}
          className="w-full py-2 rounded-lg bg-[var(--cosmic-green)] text-[var(--void-deepest)] font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Upgrading...' : `Unlock ${config.label} Mode`}
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl glass-elevated ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
          <config.icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <h3 className="font-bold text-white">Upgrade to {config.label}</h3>
          <p className="text-sm text-[var(--text-muted)]">{config.description}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {requirements.map(req => (
          <div 
            key={req.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg
              ${req.completed 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-[var(--void-surface)] border border-[var(--border-subtle)]'}
            `}
          >
            <div 
              className={`
                w-5 h-5 rounded-full flex items-center justify-center
                ${req.completed ? 'bg-green-500' : 'bg-[var(--void-elevated)]'}
              `}
            >
              {req.completed ? (
                <Unlock className="w-3 h-3 text-white" />
              ) : (
                <Lock className="w-3 h-3 text-[var(--text-muted)]" />
              )}
            </div>
            <span className={`text-sm ${req.completed ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
              {req.description}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleUpgrade}
        disabled={!allMet || isLoading}
        className={`
          w-full py-3 rounded-xl font-medium transition-all
          ${allMet 
            ? 'bg-[var(--cosmic-green)] text-[var(--void-deepest)] hover:brightness-110' 
            : 'bg-[var(--void-surface)] text-[var(--text-muted)] cursor-not-allowed'}
        `}
      >
        {isLoading 
          ? 'Upgrading...' 
          : allMet 
            ? `Unlock ${config.label} Mode` 
            : `Complete ${requirements.filter(r => !r.completed).length} more requirements`}
      </button>
    </div>
  );
}

// Feature gate wrapper component
interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ featureId, children, fallback }: FeatureGateProps) {
  const { isFeatureAvailable, currentMode } = useOnboarding();
  
  if (isFeatureAvailable(featureId)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] text-center">
      <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
      <p className="text-sm text-[var(--text-muted)]">
        This feature requires a higher access level
      </p>
      <p className="text-xs text-[var(--text-ghost)] mt-1">
        Current mode: {currentMode}
      </p>
    </div>
  );
}

export default ModeIndicator;

