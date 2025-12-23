import { useState } from 'react';
import { 
  Target, 
  Plus, 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  GitBranch,
  CheckSquare,
  Clock,
  AlertCircle,
  History,
  Link as LinkIcon,
} from 'lucide-react';
import type { Intent, Constraint, Value } from '../types';

// Mock data
const mockIntents: Intent[] = [
  {
    id: 'intent-1',
    title: 'Ship v2.0 by Q1',
    description: 'Launch version 2.0 with all core features complete and tested',
    goal: 'Launch version 2.0 with core features complete',
    constraints: [
      { id: 'c1', text: 'No breaking changes to API', type: 'hard', priority: 1 },
      { id: 'c2', text: 'Budget under $50k', type: 'hard', priority: 2 },
      { id: 'c3', text: 'Max 2 contractors', type: 'soft', priority: 3 },
    ],
    values: [
      { id: 'v1', text: 'Speed over polish', weight: 80 },
      { id: 'v2', text: 'Customer feedback prioritized', weight: 90 },
    ],
    risk_tolerance: 'moderate',
    status: 'active',
    version: 3,
    parent_intent_id: null,
    created_by: 'user-1',
    team_id: 'team-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-03-01T14:30:00Z',
    linked_decisions: ['d1', 'd2', 'd3'],
    linked_tasks: ['t1', 't2', 't3', 't4', 't5'],
  },
  {
    id: 'intent-2',
    title: 'Improve onboarding experience',
    description: 'Reduce time-to-value for new users',
    goal: 'Reduce onboarding time from 30 min to under 10 min',
    constraints: [
      { id: 'c4', text: 'Must work on mobile', type: 'hard', priority: 1 },
    ],
    values: [
      { id: 'v3', text: 'Simplicity over features', weight: 95 },
    ],
    risk_tolerance: 'low',
    status: 'active',
    version: 1,
    parent_intent_id: 'intent-1',
    created_by: 'user-1',
    team_id: 'team-1',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
    linked_decisions: ['d4'],
    linked_tasks: ['t6', 't7'],
  },
];

export default function Intents() {
  const [intents, setIntents] = useState<Intent[]>(mockIntents);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'paused']);

  const filteredIntents = intents.filter(intent => {
    const matchesSearch = intent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          intent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter.includes(intent.status);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'completed': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'abandoned': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-[var(--void-surface)] text-[var(--text-muted)]';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'moderate': return 'text-amber-400';
      case 'high': return 'text-orange-400';
      case 'aggressive': return 'text-red-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Intents</h1>
              <p className="text-sm text-[var(--text-muted)]">Define goals, constraints, and values</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Intent
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search intents..."
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--void-surface)] border border-[var(--border-subtle)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)]"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
            ${showFilters 
              ? 'bg-[var(--cosmic-purple)]/10 border-[var(--cosmic-purple)]/30 text-[var(--cosmic-purple)]' 
              : 'bg-[var(--void-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}
          `}
        >
          <Filter className="w-4 h-4" />
          Filter
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 rounded-xl glass animate-slide-up">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">Status:</span>
            {['active', 'paused', 'completed', 'abandoned'].map(status => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(prev => 
                    prev.includes(status) 
                      ? prev.filter(s => s !== status)
                      : [...prev, status]
                  );
                }}
                className={`
                  px-3 py-1 rounded-lg text-xs font-medium border transition-all capitalize
                  ${statusFilter.includes(status) ? getStatusColor(status) : 'bg-[var(--void-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'}
                `}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Intent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredIntents.map(intent => (
          <IntentCard 
            key={intent.id} 
            intent={intent}
            isSelected={selectedIntent?.id === intent.id}
            onClick={() => setSelectedIntent(selectedIntent?.id === intent.id ? null : intent)}
          />
        ))}
      </div>

      {filteredIntents.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-[var(--text-ghost)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">No intents match your search</p>
        </div>
      )}

      {/* Intent Detail Panel */}
      {selectedIntent && (
        <IntentDetailPanel 
          intent={selectedIntent} 
          onClose={() => setSelectedIntent(null)}
        />
      )}
    </div>
  );
}

interface IntentCardProps {
  intent: Intent;
  isSelected: boolean;
  onClick: () => void;
}

function IntentCard({ intent, isSelected, onClick }: IntentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'completed': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'abandoned': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-[var(--void-surface)] text-[var(--text-muted)]';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        text-left p-6 rounded-2xl transition-all duration-300
        ${isSelected 
          ? 'glass-elevated border-2 border-purple-500/50 scale-[1.01]' 
          : 'glass border border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{intent.title}</h3>
            <p className="text-xs text-[var(--text-muted)]">v{intent.version}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(intent.status)}`}>
          {intent.status}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
        {intent.description}
      </p>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{intent.constraints.length} constraints</span>
        </div>
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          <span>{intent.linked_decisions.length} decisions</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckSquare className="w-3 h-3" />
          <span>{intent.linked_tasks.length} tasks</span>
        </div>
      </div>
    </button>
  );
}

interface IntentDetailPanelProps {
  intent: Intent;
  onClose: () => void;
}

function IntentDetailPanel({ intent, onClose }: IntentDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'constraints' | 'values' | 'history'>('overview');

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--void-surface)] border-l border-[var(--border-subtle)] z-40 animate-slide-in-right overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--void-surface)] border-b border-[var(--border-subtle)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{intent.title}</h2>
              <p className="text-sm text-[var(--text-muted)]">Version {intent.version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--void-elevated)] transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['overview', 'constraints', 'values', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                ${activeTab === tab 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-[var(--text-muted)] hover:text-white'}
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Goal</h4>
              <p className="text-[var(--text-primary)]">{intent.goal}</p>
            </div>

            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Risk Tolerance</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[var(--void-elevated)] overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      intent.risk_tolerance === 'low' ? 'w-1/4 bg-green-500' :
                      intent.risk_tolerance === 'moderate' ? 'w-2/4 bg-amber-500' :
                      intent.risk_tolerance === 'high' ? 'w-3/4 bg-orange-500' :
                      'w-full bg-red-500'
                    }`}
                  />
                </div>
                <span className="text-sm text-[var(--text-secondary)] capitalize">{intent.risk_tolerance}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Linked Items</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--void-elevated)]">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-orange-400" />
                    <span className="text-2xl font-bold text-white">{intent.linked_decisions.length}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Decisions</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--void-elevated)]">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-2xl font-bold text-white">{intent.linked_tasks.length}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Tasks</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'constraints' && (
          <div className="space-y-3">
            {intent.constraints.map(constraint => (
              <div 
                key={constraint.id}
                className={`
                  p-4 rounded-xl border
                  ${constraint.type === 'hard' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-amber-500/10 border-amber-500/30'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${constraint.type === 'hard' ? 'text-red-400' : 'text-amber-400'}`}>
                    {constraint.type === 'hard' ? 'Hard Constraint' : 'Soft Constraint'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">Priority {constraint.priority}</span>
                </div>
                <p className="text-[var(--text-primary)]">{constraint.text}</p>
              </div>
            ))}
            
            <button className="w-full p-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-default)] transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Constraint
            </button>
          </div>
        )}

        {activeTab === 'values' && (
          <div className="space-y-3">
            {intent.values.map(value => (
              <div key={value.id} className="p-4 rounded-xl bg-[var(--void-elevated)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[var(--text-primary)]">{value.text}</p>
                  <span className="text-sm font-medium text-purple-400">{value.weight}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--void-surface)] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${value.weight}%` }}
                  />
                </div>
              </div>
            ))}
            
            <button className="w-full p-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-default)] transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Value
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--void-elevated)]">
              <History className="w-4 h-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm text-white">Version 3 (current)</p>
                <p className="text-xs text-[var(--text-muted)]">{new Date(intent.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--void-surface)]">
              <History className="w-4 h-4 text-[var(--text-ghost)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Version 2</p>
                <p className="text-xs text-[var(--text-muted)]">Added budget constraint</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--void-surface)]">
              <History className="w-4 h-4 text-[var(--text-ghost)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Version 1</p>
                <p className="text-xs text-[var(--text-muted)]">Initial creation</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 bg-[var(--void-surface)] border-t border-[var(--border-subtle)] p-4 flex gap-3">
        <button className="flex-1 py-2 rounded-xl bg-[var(--void-elevated)] text-[var(--text-secondary)] hover:text-white transition-all flex items-center justify-center gap-2">
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
        <button className="py-2 px-4 rounded-xl bg-[var(--void-elevated)] text-[var(--text-secondary)] hover:text-white transition-all">
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

