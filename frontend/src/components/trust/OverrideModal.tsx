import { useState } from 'react';
import { X, AlertTriangle, MessageSquare, Check, Clock } from 'lucide-react';
import type { OverrideReason, Override } from '../../types';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: OverrideReason; reasonText?: string; correction: string }) => Promise<void>;
  entityType: string;
  entityTitle: string;
  originalContent: string;
}

const OVERRIDE_REASONS: { value: OverrideReason; label: string; description: string }[] = [
  { 
    value: 'factually_incorrect', 
    label: 'Factually Incorrect', 
    description: 'The information presented is wrong' 
  },
  { 
    value: 'missing_context', 
    label: 'Missing Context', 
    description: 'Important context was not considered' 
  },
  { 
    value: 'correlation_not_causation', 
    label: 'Correlation ≠ Causation', 
    description: 'The cause-effect relationship is assumed incorrectly' 
  },
  { 
    value: 'outdated', 
    label: 'Outdated', 
    description: 'This was true before but no longer applies' 
  },
  { 
    value: 'misattributed', 
    label: 'Misattributed', 
    description: 'This is attributed to the wrong source or person' 
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: 'Another reason not listed above' 
  },
];

export function OverrideModal({
  isOpen,
  onClose,
  onSubmit,
  entityType,
  entityTitle,
  originalContent,
}: OverrideModalProps) {
  const [selectedReason, setSelectedReason] = useState<OverrideReason | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [correction, setCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }
    if (!correction.trim()) {
      setError('Please provide your correction');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        reason: selectedReason,
        reasonText: selectedReason === 'other' ? reasonText : undefined,
        correction: correction.trim(),
      });
      onClose();
    } catch (err) {
      setError('Failed to submit override. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSelectedReason(null);
    setReasonText('');
    setCorrection('');
    setError(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={resetAndClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className="w-full max-w-lg bg-[var(--void-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Mark as Incorrect</h2>
                <p className="text-sm text-[var(--text-muted)]">Help us improve by correcting this {entityType}</p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 rounded-lg hover:bg-[var(--void-elevated)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Original content */}
            <div className="p-4 rounded-xl bg-[var(--void-elevated)] border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Original {entityType}</p>
              <p className="text-sm text-[var(--text-secondary)]">{originalContent}</p>
            </div>

            {/* Reason selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                What's wrong?
              </label>
              <div className="space-y-2">
                {OVERRIDE_REASONS.map(reason => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={`
                      w-full p-3 rounded-xl border text-left transition-all
                      ${selectedReason === reason.value 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-[var(--void-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${selectedReason === reason.value 
                            ? 'border-red-400 bg-red-400' 
                            : 'border-[var(--text-muted)]'}
                        `}
                      >
                        {selectedReason === reason.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{reason.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{reason.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional text for "other" reason */}
            {selectedReason === 'other' && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Please explain
                </label>
                <textarea
                  value={reasonText}
                  onChange={e => setReasonText(e.target.value)}
                  placeholder="What's the issue?"
                  className="w-full p-3 rounded-xl bg-[var(--void-elevated)] border border-[var(--border-subtle)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] resize-none h-20"
                />
              </div>
            )}

            {/* Correction input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Your correction
              </label>
              <textarea
                value={correction}
                onChange={e => setCorrection(e.target.value)}
                placeholder="What should it say instead?"
                className="w-full p-3 rounded-xl bg-[var(--void-elevated)] border border-[var(--border-subtle)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] resize-none h-24"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Note about what happens next */}
            <div className="p-3 rounded-xl bg-[var(--void-elevated)]">
              <p className="text-xs text-[var(--text-muted)]">
                <strong className="text-[var(--text-secondary)]">What happens next:</strong> Your feedback will be reviewed and used to improve future insights. The original content will be marked as disputed.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-[var(--border-subtle)]">
            <button
              onClick={resetAndClose}
              className="flex-1 py-3 rounded-xl bg-[var(--void-elevated)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--void-float)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReason || !correction.trim()}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all
                ${isSubmitting || !selectedReason || !correction.trim()
                  ? 'bg-[var(--void-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'}
              `}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Override'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Badge to show when content has been disputed
interface DisagreementBadgeProps {
  overrides: Override[];
  className?: string;
}

export function DisagreementBadge({ overrides, className = '' }: DisagreementBadgeProps) {
  if (!overrides || overrides.length === 0) return null;

  const pendingCount = overrides.filter(o => o.status === 'pending_review').length;
  const acceptedCount = overrides.filter(o => o.status === 'accepted').length;

  if (pendingCount === 0 && acceptedCount === 0) return null;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${className}`}
      title={`${pendingCount} pending, ${acceptedCount} accepted overrides`}
    >
      {pendingCount > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
          <Clock className="w-3 h-3" />
          {pendingCount} disputed
        </span>
      )}
      {acceptedCount > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
          <Check className="w-3 h-3" />
          {acceptedCount} corrected
        </span>
      )}
    </div>
  );
}

// Simple button to trigger override modal
interface OverrideButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function OverrideButton({ onClick, size = 'md', className = '' }: OverrideButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs gap-1' 
    : 'px-3 py-1.5 text-sm gap-1.5';

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center rounded-lg font-medium
        bg-red-500/10 text-red-400 border border-red-500/30
        hover:bg-red-500/20 hover:border-red-500/50
        transition-all
        ${sizeClasses}
        ${className}
      `}
    >
      <MessageSquare className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      Disagree
    </button>
  );
}

export default OverrideModal;

