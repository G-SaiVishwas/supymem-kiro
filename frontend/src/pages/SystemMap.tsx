import { useEffect, useState } from 'react';
import { 
  Network, 
  RefreshCw, 
  Filter, 
  Download, 
  Maximize2,
  Info,
  ChevronDown,
  User,
  Bot,
  X,
} from 'lucide-react';
import { useCausalGraph } from '../contexts/SystemStateContext';
import { CausalGraph, NodeDetailPanel } from '../components/graph/CausalGraph';
import type { AgentType, CausalNodeType } from '../types';

type FilterState = {
  nodeTypes: CausalNodeType[];
  agentTypes: AgentType[];
  confidenceMin: number;
};

export default function SystemMap() {
  const { graph, isLoading, refresh, selectedNodeId, setSelectedNodeId } = useCausalGraph();
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    nodeTypes: ['intent', 'decision', 'task', 'execution', 'outcome', 'insight'],
    agentTypes: ['human', 'ai'],
    confidenceMin: 0,
  });

  // Load graph on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filter nodes and edges
  const filteredNodes = graph?.nodes.filter(node => {
    if (!filters.nodeTypes.includes(node.type)) return false;
    if (!filters.agentTypes.includes(node.agency)) return false;
    return true;
  }) || [];

  const filteredEdges = graph?.edges.filter(edge => {
    const sourceIncluded = filteredNodes.some(n => n.id === edge.source);
    const targetIncluded = filteredNodes.some(n => n.id === edge.target);
    return sourceIncluded && targetIncluded;
  }) || [];

  const selectedNode = selectedNodeId ? filteredNodes.find(n => n.id === selectedNodeId) : null;

  const toggleNodeType = (type: CausalNodeType) => {
    setFilters(prev => ({
      ...prev,
      nodeTypes: prev.nodeTypes.includes(type)
        ? prev.nodeTypes.filter(t => t !== type)
        : [...prev.nodeTypes, type],
    }));
  };

  const toggleAgentType = (type: AgentType) => {
    setFilters(prev => ({
      ...prev,
      agentTypes: prev.agentTypes.includes(type)
        ? prev.agentTypes.filter(t => t !== type)
        : [...prev.agentTypes, type],
    }));
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[var(--void-deepest)]' : ''}`}>
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">System Map</h1>
                <p className="text-sm text-[var(--text-muted)]">
                  Visualize the flow from Intent → Insight
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                ${showFilters 
                  ? 'bg-[var(--cosmic-cyan)]/10 border-[var(--cosmic-cyan)]/30 text-[var(--cosmic-cyan)]' 
                  : 'bg-[var(--void-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'}
              `}
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white transition-all"
            >
              {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="p-4 rounded-xl glass-elevated animate-slide-up">
            <div className="flex flex-wrap gap-6">
              {/* Node types */}
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Node Types</p>
                <div className="flex flex-wrap gap-2">
                  {(['intent', 'decision', 'task', 'execution', 'outcome', 'insight'] as CausalNodeType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleNodeType(type)}
                      className={`
                        px-3 py-1 rounded-lg text-xs font-medium transition-all
                        ${filters.nodeTypes.includes(type)
                          ? 'bg-[var(--cosmic-cyan)]/20 text-[var(--cosmic-cyan)] border border-[var(--cosmic-cyan)]/30'
                          : 'bg-[var(--void-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent types */}
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Agency</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAgentType('human')}
                    className={`
                      flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all
                      ${filters.agentTypes.includes('human')
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-[var(--void-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}
                    `}
                  >
                    <User className="w-3 h-3" />
                    Human
                  </button>
                  <button
                    onClick={() => toggleAgentType('ai')}
                    className={`
                      flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all
                      ${filters.agentTypes.includes('ai')
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-[var(--void-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}
                    `}
                  >
                    <Bot className="w-3 h-3" />
                    AI
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="ml-auto flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{filteredNodes.length} nodes</span>
                <span>{filteredEdges.length} connections</span>
              </div>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--cosmic-cyan)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Understanding Your System</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                This map shows how your team's <strong className="text-purple-400">Intents</strong> flow through 
                <strong className="text-orange-400"> Decisions</strong> and <strong className="text-cyan-400">Tasks</strong> into 
                <strong className="text-green-400"> Outcomes</strong> and <strong className="text-pink-400">Insights</strong>. 
                Click any node to see its connections and details.
              </p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Graph */}
          <div className="flex-1 glass-elevated rounded-2xl p-6 overflow-auto">
            {isLoading && !graph ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[var(--cosmic-cyan)] animate-spin" />
                  <p className="text-sm text-[var(--text-muted)]">Loading system map...</p>
                </div>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Network className="w-12 h-12 text-[var(--text-ghost)] mx-auto mb-3" />
                  <p className="text-[var(--text-muted)]">No nodes match your filters</p>
                  <button
                    onClick={() => setFilters({
                      nodeTypes: ['intent', 'decision', 'task', 'execution', 'outcome', 'insight'],
                      agentTypes: ['human', 'ai'],
                      confidenceMin: 0,
                    })}
                    className="mt-3 text-sm text-[var(--cosmic-cyan)] hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <CausalGraph
                nodes={filteredNodes}
                edges={filteredEdges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            )}
          </div>

          {/* Detail panel */}
          {selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              edges={filteredEdges}
              allNodes={filteredNodes}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

