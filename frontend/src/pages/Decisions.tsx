import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, GitBranch, ExternalLink, MessageSquare, Loader2 } from 'lucide-react';
import { getDecisions, challengeDecision } from '../api/client';
import type { Decision, ChallengeResult } from '../types';
import ReactMarkdown from 'react-markdown';

const importanceColors = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

function DecisionCard({ decision, onChallenge }: { decision: Decision; onChallenge: (id: string) => void }) {
  return (
    <div className="glass rounded-xl p-5 hover:glow transition-all animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="font-semibold">{decision.title}</h3>
          </div>
          {decision.summary && (
            <p className="text-sm text-[var(--color-text-muted)] mb-3">{decision.summary}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            {decision.category && (
              <span className="px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">{decision.category}</span>
            )}
            {decision.importance && (
              <span className={`px-2 py-0.5 rounded ${importanceColors[decision.importance as keyof typeof importanceColors] || importanceColors.medium}`}>
                {decision.importance}
              </span>
            )}
            {decision.decided_by && <span>by {decision.decided_by}</span>}
            <span>{new Date(decision.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {decision.source_url && (
            <a
              href={decision.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[var(--color-text-muted)]" />
            </a>
          )}
          <button
            onClick={() => onChallenge(decision.id)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] rounded-lg transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

function ChallengePanel({
  result,
  isLoading,
  onClose,
}: {
  result: ChallengeResult | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!result && !isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
            <span className="ml-3">Analyzing decision...</span>
          </div>
        ) : result ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Challenge Analysis</h2>
              <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
                ✕
              </button>
            </div>

            {result.decision && (
              <div className="mb-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
                <h3 className="font-medium mb-2">{result.decision.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{result.original_reasoning}</p>
              </div>
            )}

            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{result.ai_analysis}</ReactMarkdown>
            </div>

            {result.suggested_alternatives.length > 0 && result.suggested_alternatives[0] !== "No alternatives recommended - original decision is sound." && (
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-medium text-purple-400 mb-2">Suggested Alternatives</h4>
                <ul className="list-disc list-inside text-sm text-[var(--color-text-secondary)]">
                  {result.suggested_alternatives.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 text-sm text-[var(--color-text-muted)]">
              <span>Confidence: {(result.confidence * 100).toFixed(0)}%</span>
              {result.related_discussions.length > 0 && (
                <span>• {result.related_discussions.length} related discussions found</span>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function Decisions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: () => getDecisions(),
  });

  const challengeMutation = useMutation({
    mutationFn: ({ question, decisionId }: { question: string; decisionId?: string }) =>
      challengeDecision(question, undefined, decisionId),
    onSuccess: (data) => {
      setChallengeResult(data);
    },
  });

  const handleChallenge = (decisionId: string) => {
    const decision = decisions.find((d) => d.id === decisionId);
    if (decision) {
      setShowChallenge(true);
      challengeMutation.mutate({
        question: `Why was this decision made: "${decision.title}"? Is it still valid?`,
        decisionId,
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowChallenge(true);
    challengeMutation.mutate({ question: searchQuery });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Decisions</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Browse past decisions and challenge them with full context
        </p>
      </div>

      {/* Search / Challenge */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask about a past decision... e.g., 'Why did we choose PostgreSQL?'"
            className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </form>

      {/* Decision List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">Loading decisions...</div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-8 glass rounded-xl">
            <GitBranch className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">No decisions recorded yet</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Decisions will be automatically extracted from PRs, commits, and discussions.
            </p>
          </div>
        ) : (
          decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} onChallenge={handleChallenge} />
          ))
        )}
      </div>

      {/* Challenge Panel */}
      {showChallenge && (
        <ChallengePanel
          result={challengeResult}
          isLoading={challengeMutation.isPending}
          onClose={() => {
            setShowChallenge(false);
            setChallengeResult(null);
          }}
        />
      )}
    </div>
  );
}

