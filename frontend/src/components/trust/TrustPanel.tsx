import { useState } from 'react';
import { 
  X, 
  Shield, 
  Eye, 
  EyeOff, 
  Settings, 
  Lock, 
  Unlock,
  Database,
  Clock,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useTrust } from '../../contexts/TrustContext';
import type { TrustPolicy, DataVisibility } from '../../types';

interface TrustPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'tracking' | 'visibility' | 'display';

export function TrustPanel({ isOpen, onClose }: TrustPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tracking');
  const {
    trustPolicies,
    dataVisibility,
    updatePolicy,
    isLoadingPolicies,
    showConfidenceBadges,
    setShowConfidenceBadges,
    showAgencyBadges,
    setShowAgencyBadges,
    showSourceAttribution,
    setShowSourceAttribution,
  } = useTrust();

  if (!isOpen) return null;

  const tabs = [
    { id: 'tracking' as TabId, label: 'What We Track', icon: Database },
    { id: 'visibility' as TabId, label: 'Who Sees What', icon: Eye },
    { id: 'display' as TabId, label: 'Display Preferences', icon: Settings },
  ];

  const trackingPolicies = trustPolicies.filter(p => p.category === 'tracking');
  const usagePolicies = trustPolicies.filter(p => p.category === 'usage');
  const retentionPolicies = trustPolicies.filter(p => p.category === 'retention');

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--void-deep)] border-l border-[var(--border-subtle)] z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Trust & Privacy</h2>
              <p className="text-sm text-[var(--text-muted)]">Control how Supymem handles your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--void-surface)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-[var(--border-subtle)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-[var(--cosmic-cyan)]/10 text-[var(--cosmic-cyan)] border border-[var(--cosmic-cyan)]/30' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--void-surface)]'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              {/* What We Track */}
              <section>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--cosmic-cyan)]" />
                  What We Track
                </h3>
                <div className="space-y-2">
                  {trackingPolicies.map(policy => (
                    <PolicyToggle 
                      key={policy.id} 
                      policy={policy} 
                      onToggle={updatePolicy}
                      isLoading={isLoadingPolicies}
                    />
                  ))}
                </div>
              </section>

              {/* How We Use It */}
              <section>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[var(--cosmic-purple)]" />
                  How We Use It
                </h3>
                <div className="space-y-2">
                  {usagePolicies.map(policy => (
                    <PolicyToggle 
                      key={policy.id} 
                      policy={policy} 
                      onToggle={updatePolicy}
                      isLoading={isLoadingPolicies}
                    />
                  ))}
                </div>
              </section>

              {/* Data Retention */}
              <section>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--cosmic-orange)]" />
                  Data Retention
                </h3>
                <div className="space-y-2">
                  {retentionPolicies.map(policy => (
                    <PolicyToggle 
                      key={policy.id} 
                      policy={policy} 
                      onToggle={updatePolicy}
                      isLoading={isLoadingPolicies}
                    />
                  ))}
                </div>
              </section>

              {/* Important Notice */}
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-400">
                      Never Used for Performance Evaluation
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Supymem data is never used to evaluate individual performance. 
                      We believe in supporting teams, not surveillance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visibility' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Understand who can see different types of data in your organization.
              </p>
              
              {dataVisibility.map((item, i) => (
                <VisibilityItem key={i} item={item} />
              ))}
              
              <div className="p-4 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] mt-6">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-[var(--cosmic-cyan)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      You Control Your Data
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Voice notes and personal captures are private by default. 
                      You choose what to share with your team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Customize how trust and transparency indicators appear in the UI.
              </p>
              
              <DisplayToggle
                label="Show Confidence Badges"
                description="Display confidence levels on AI-generated insights"
                enabled={showConfidenceBadges}
                onToggle={setShowConfidenceBadges}
              />
              
              <DisplayToggle
                label="Show Agency Badges"
                description="Indicate whether actions were human or AI initiated"
                enabled={showAgencyBadges}
                onToggle={setShowAgencyBadges}
              />
              
              <DisplayToggle
                label="Show Source Attribution"
                description="Display sources used for AI insights"
                enabled={showSourceAttribution}
                onToggle={setShowSourceAttribution}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <a 
            href="/trust" 
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--void-surface)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-elevated)] transition-colors"
          >
            <span>View Full Trust & Privacy Policy</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  );
}

interface PolicyToggleProps {
  policy: TrustPolicy;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

function PolicyToggle({ policy, onToggle, isLoading }: PolicyToggleProps) {
  const handleToggle = () => {
    if (policy.user_controllable) {
      onToggle(policy.id, !policy.enabled);
    }
  };

  return (
    <div 
      className={`
        flex items-center justify-between p-3 rounded-xl 
        bg-[var(--void-surface)] border border-[var(--border-subtle)]
        ${policy.user_controllable ? 'cursor-pointer hover:border-[var(--border-default)]' : 'opacity-80'}
        transition-all
      `}
      onClick={handleToggle}
    >
      <div className="flex items-center gap-3">
        {policy.user_controllable ? (
          <Unlock className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <Lock className="w-4 h-4 text-[var(--text-muted)]" />
        )}
        <div>
          <p className="text-sm font-medium text-white">{policy.title}</p>
          <p className="text-xs text-[var(--text-muted)]">{policy.description}</p>
        </div>
      </div>
      
      <div 
        className={`
          w-10 h-6 rounded-full relative transition-colors
          ${policy.enabled ? 'bg-[var(--cosmic-green)]' : 'bg-[var(--void-elevated)]'}
          ${!policy.user_controllable ? 'opacity-50' : ''}
        `}
      >
        <div 
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${policy.enabled ? 'left-5' : 'left-1'}
          `}
        />
      </div>
    </div>
  );
}

interface VisibilityItemProps {
  item: DataVisibility;
}

function VisibilityItem({ item }: VisibilityItemProps) {
  const visibilityLabels: Record<string, string> = {
    self: 'You',
    team: 'Team',
    managers: 'Managers',
    admins: 'Admins',
    org: 'Organization',
  };

  return (
    <div className="p-3 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-white">{item.data_type}</p>
        <div className="flex gap-1">
          {item.visible_to.map(level => (
            <span 
              key={level}
              className="px-2 py-0.5 rounded-full bg-[var(--void-elevated)] text-xs text-[var(--text-secondary)]"
            >
              {visibilityLabels[level]}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
    </div>
  );
}

interface DisplayToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function DisplayToggle({ label, description, enabled, onToggle }: DisplayToggleProps) {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-default)] transition-all"
      onClick={() => onToggle(!enabled)}
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      
      <div 
        className={`
          w-10 h-6 rounded-full relative transition-colors
          ${enabled ? 'bg-[var(--cosmic-cyan)]' : 'bg-[var(--void-elevated)]'}
        `}
      >
        <div 
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${enabled ? 'left-5' : 'left-1'}
          `}
        />
      </div>
    </div>
  );
}

// Floating trust button that opens the panel
export function TrustButton() {
  const { openTrustPanel, isTrustPanelOpen, closeTrustPanel } = useTrust();

  return (
    <>
      <button
        onClick={openTrustPanel}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform z-30"
        title="Trust & Privacy"
      >
        <Shield className="w-6 h-6 text-white" />
      </button>
      
      <TrustPanel isOpen={isTrustPanelOpen} onClose={closeTrustPanel} />
    </>
  );
}

export default TrustPanel;

