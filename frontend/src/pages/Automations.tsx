import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Plus, Trash2, Pause, Play, Loader2, CheckCircle } from 'lucide-react';
import { getAutomationRules, createAutomation, updateRuleStatus, deleteRule, parseAutomation } from '../api/client';
import type { AutomationRule } from '../types';

const triggerIcons: Record<string, string> = {
  task_completed: '✅',
  pr_merged: '🔀',
  pr_opened: '📝',
  file_changed: '📁',
  time_based: '⏰',
  keyword_detected: '🔍',
};

const actionIcons: Record<string, string> = {
  notify_user: '🔔',
  create_task: '📋',
  assign_task: '👤',
  send_message: '💬',
  update_task: '✏️',
};

function AutomationCard({
  rule,
  onPause,
  onResume,
  onDelete,
}: {
  rule: AutomationRule;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isActive = rule.status === 'active';

  return (
    <div className={`glass rounded-xl p-5 transition-all animate-fade-in ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{triggerIcons[rule.trigger_type] || '⚡'}</span>
            <span className="text-[var(--color-text-muted)]">→</span>
            <span className="text-xl">{actionIcons[rule.action_type] || '🎯'}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {rule.status}
            </span>
          </div>
          <p className="font-medium mb-2">{rule.description || rule.original_instruction}</p>
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <span>Created by {rule.created_by}</span>
            <span>Triggered {rule.execution_count} times</span>
            {rule.last_triggered_at && (
              <span>Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={() => onPause(rule.id)}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
              title="Pause"
            >
              <Pause className="w-4 h-4 text-yellow-400" />
            </button>
          ) : (
            <button
              onClick={() => onResume(rule.id)}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
              title="Resume"
            >
              <Play className="w-4 h-4 text-green-400" />
            </button>
          )}
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAutomationModal({ onClose }: { onClose: () => void }) {
  const [instruction, setInstruction] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [parseResult, setParseResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: () => parseAutomation(instruction),
    onSuccess: (data) => {
      if (data.success) {
        setParseResult(data);
        setStep('confirm');
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createAutomation(instruction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setStep('success');
      setTimeout(onClose, 1500);
    },
  });

  const handleParse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    parseMutation.mutate();
  };

  const exampleInstructions = [
    "When John completes a CSS task, notify him that API integration is next priority",
    "After any PR is merged to main, create a task to update the changelog",
    "If Rahul finishes the login feature, assign the signup task to him",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'input' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-[var(--color-accent)]" />
              <h2 className="text-xl font-semibold">Create Automation</h2>
            </div>
            <p className="text-[var(--color-text-muted)] mb-4">
              Describe what you want to automate in natural language:
            </p>
            <form onSubmit={handleParse}>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="When [trigger], then [action]..."
                className="w-full px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-accent)] resize-none h-24"
              />
              <div className="mt-4 space-y-2">
                <p className="text-sm text-[var(--color-text-muted)]">Examples:</p>
                {exampleInstructions.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInstruction(ex)}
                    className="block w-full text-left text-sm px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] rounded-lg transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!instruction.trim() || parseMutation.isPending}
                  className="flex-1 px-4 py-2 bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {parseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Parse
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'confirm' && parseResult && (
          <>
            <h2 className="text-xl font-semibold mb-4">Confirm Automation</h2>
            <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg mb-4 whitespace-pre-wrap">
              {parseResult.confirmation_message}
            </div>
            <div className="text-sm text-[var(--color-text-muted)] mb-4">
              Confidence: {(parseResult.confidence * 100).toFixed(0)}%
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Rule
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Automation Created!</h2>
            <p className="text-[var(--color-text-muted)] mt-2">Your rule is now active.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Automations() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => getAutomationRules(),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => updateRuleStatus(id, 'paused'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => updateRuleStatus(id, 'active'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const activeRules = rules.filter((r) => r.status === 'active');
  const pausedRules = rules.filter((r) => r.status === 'paused');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Create rules with natural language to automate your workflow
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeRules.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Active</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pausedRules.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Paused</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {rules.reduce((sum, r) => sum + r.execution_count, 0)}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Total Executions</p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">Loading automations...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 glass rounded-xl">
            <Zap className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">No automations yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Create your first automation with natural language!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Create Automation
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <AutomationCard
              key={rule.id}
              rule={rule}
              onPause={(id) => pauseMutation.mutate(id)}
              onResume={(id) => resumeMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && <CreateAutomationModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

