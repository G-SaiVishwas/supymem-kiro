import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Clock, 
  Check, 
  X,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  User,
  Bot,
  Info,
} from 'lucide-react';
import { useTrust } from '../contexts/TrustContext';

export default function Trust() {
  const { 
    trustPolicies, 
    dataVisibility, 
    updatePolicy,
    isLoadingPolicies,
  } = useTrust();

  const trackingPolicies = trustPolicies.filter(p => p.category === 'tracking');
  const usagePolicies = trustPolicies.filter(p => p.category === 'usage');
  const retentionPolicies = trustPolicies.filter(p => p.category === 'retention');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Trust & Privacy</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Supymem is designed with transparency at its core. Here's everything about how we handle your data.
        </p>
      </div>

      {/* Core Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CommitmentCard
          icon={Lock}
          title="Your Data, Your Control"
          description="You own your data. Export or delete anytime."
          color="cyan"
        />
        <CommitmentCard
          icon={Eye}
          title="Transparent AI"
          description="Always see what AI did and why."
          color="purple"
        />
        <CommitmentCard
          icon={Shield}
          title="Never for Performance"
          description="We never use data to evaluate individuals."
          color="green"
        />
      </div>

      {/* What We Track */}
      <section className="glass-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">What We Track</h2>
            <p className="text-sm text-[var(--text-muted)]">Data sources and collection policies</p>
          </div>
        </div>

        <div className="space-y-3">
          {trackingPolicies.map(policy => (
            <PolicyItem 
              key={policy.id} 
              policy={policy} 
              onToggle={updatePolicy}
              isLoading={isLoadingPolicies}
            />
          ))}
        </div>
      </section>

      {/* How We Use It */}
      <section className="glass-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">How AI Uses Your Data</h2>
            <p className="text-sm text-[var(--text-muted)]">AI capabilities and limitations</p>
          </div>
        </div>

        <div className="space-y-3">
          {usagePolicies.map(policy => (
            <PolicyItem 
              key={policy.id} 
              policy={policy} 
              onToggle={updatePolicy}
              isLoading={isLoadingPolicies}
            />
          ))}
        </div>

        {/* AI Transparency */}
        <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            AI Transparency Guarantee
          </h4>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Every AI action is labeled with a badge showing it came from AI
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Confidence levels show how certain the AI is about its suggestions
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Sources are always attributed so you can verify
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              You can override any AI suggestion and we'll learn from it
            </li>
          </ul>
        </div>
      </section>

      {/* Data Visibility */}
      <section className="glass-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Who Sees What</h2>
            <p className="text-sm text-[var(--text-muted)]">Data visibility by role</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Data Type</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">You</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Team</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Managers</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Admins</th>
              </tr>
            </thead>
            <tbody>
              {dataVisibility.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-white">{item.data_type}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                  </td>
                  <td className="text-center py-3 px-4">
                    {item.visible_to.includes('self') ? (
                      <Check className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text-ghost)] mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    {item.visible_to.includes('team') ? (
                      <Check className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text-ghost)] mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    {item.visible_to.includes('managers') ? (
                      <Check className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text-ghost)] mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    {item.visible_to.includes('admins') ? (
                      <Check className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text-ghost)] mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data Retention */}
      <section className="glass-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Data Retention</h2>
            <p className="text-sm text-[var(--text-muted)]">How long we keep your data</p>
          </div>
        </div>

        <div className="space-y-3">
          {retentionPolicies.map(policy => (
            <PolicyItem 
              key={policy.id} 
              policy={policy} 
              onToggle={updatePolicy}
              isLoading={isLoadingPolicies}
            />
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-[var(--void-surface)]">
          <h4 className="font-medium text-white mb-2">Your Rights</h4>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--cosmic-cyan)]" />
              Export all your data at any time
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--cosmic-cyan)]" />
              Request deletion of specific items or all data
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--cosmic-cyan)]" />
              Mark items to never be deleted
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--cosmic-cyan)]" />
              Set custom expiration dates
            </li>
          </ul>
        </div>
      </section>

      {/* Never Used For */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-green-400" />
          <h2 className="text-xl font-bold text-white">What Supymem Will Never Do</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NeverItem text="Evaluate individual performance" />
          <NeverItem text="Compare employees against each other" />
          <NeverItem text="Share data with your employer without consent" />
          <NeverItem text="Use data for advertising" />
          <NeverItem text="Sell data to third parties" />
          <NeverItem text="Train AI on your data without permission" />
        </div>
      </section>

      {/* Contact */}
      <div className="text-center text-sm text-[var(--text-muted)]">
        <p>Questions about privacy? Contact us at <a href="mailto:privacy@supymem.com" className="text-[var(--cosmic-cyan)] hover:underline">privacy@supymem.com</a></p>
      </div>
    </div>
  );
}

interface CommitmentCardProps {
  icon: typeof Lock;
  title: string;
  description: string;
  color: 'cyan' | 'purple' | 'green';
}

function CommitmentCard({ icon: Icon, title, description, color }: CommitmentCardProps) {
  const colors = {
    cyan: 'from-cyan-500 to-blue-500 shadow-cyan-500/20',
    purple: 'from-purple-500 to-pink-500 shadow-purple-500/20',
    green: 'from-green-500 to-emerald-500 shadow-green-500/20',
  };

  return (
    <div className="glass rounded-xl p-6 text-center">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

interface PolicyItemProps {
  policy: {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
    user_controllable: boolean;
  };
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

function PolicyItem({ policy, onToggle, isLoading }: PolicyItemProps) {
  return (
    <div 
      className={`
        flex items-center justify-between p-4 rounded-xl 
        bg-[var(--void-surface)] border border-[var(--border-subtle)]
        ${policy.user_controllable ? 'cursor-pointer hover:border-[var(--border-default)]' : ''}
        transition-all
      `}
      onClick={() => policy.user_controllable && onToggle(policy.id, !policy.enabled)}
    >
      <div className="flex items-center gap-3">
        {policy.user_controllable ? (
          <Lock className="w-4 h-4 text-[var(--text-muted)] opacity-0" />
        ) : (
          <Lock className="w-4 h-4 text-[var(--text-muted)]" title="This setting cannot be changed" />
        )}
        <div>
          <p className="font-medium text-white">{policy.title}</p>
          <p className="text-sm text-[var(--text-muted)]">{policy.description}</p>
        </div>
      </div>
      
      <div 
        className={`
          w-12 h-7 rounded-full relative transition-colors flex-shrink-0
          ${policy.enabled ? 'bg-[var(--cosmic-green)]' : 'bg-[var(--void-elevated)]'}
          ${!policy.user_controllable ? 'opacity-60' : ''}
        `}
      >
        <div 
          className={`
            absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
            ${policy.enabled ? 'left-6' : 'left-1'}
          `}
        />
      </div>
    </div>
  );
}

function NeverItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
      <X className="w-5 h-5 text-red-400 flex-shrink-0" />
      <span className="text-[var(--text-primary)]">{text}</span>
    </div>
  );
}

