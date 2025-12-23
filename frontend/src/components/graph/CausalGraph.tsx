import { useState, useCallback, useMemo } from 'react';
import { 
  Target, 
  GitBranch, 
  CheckSquare, 
  Zap, 
  BarChart3, 
  Lightbulb,
  ChevronRight,
  User,
  Bot,
  Info,
} from 'lucide-react';
import type { CausalNode, CausalEdge, CausalNodeType, ConfidenceLevel, AgentType } from '../../types';
import { ConfidenceIndicator } from '../trust/ConfidenceBadge';
import { AgencyIcon } from '../trust/AgencyBadge';

interface CausalGraphProps {
  nodes: CausalNode[];
  edges: CausalEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  className?: string;
}

const NODE_CONFIG: Record<CausalNodeType, {
  icon: typeof Target;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  intent: {
    icon: Target,
    label: 'Intent',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  decision: {
    icon: GitBranch,
    label: 'Decision',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
  },
  task: {
    icon: CheckSquare,
    label: 'Task',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
  },
  execution: {
    icon: Zap,
    label: 'Execution',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
  },
  outcome: {
    icon: BarChart3,
    label: 'Outcome',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
  insight: {
    icon: Lightbulb,
    label: 'Insight',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
  },
};

// Simplified flow-based layout (CSS-only, no external library needed initially)
export function CausalGraph({ nodes, edges, selectedNodeId, onNodeSelect, className = '' }: CausalGraphProps) {
  // Group nodes by type for flow layout
  const nodesByType = useMemo(() => {
    const groups: Record<CausalNodeType, CausalNode[]> = {
      intent: [],
      decision: [],
      task: [],
      execution: [],
      outcome: [],
      insight: [],
    };
    
    nodes.forEach(node => {
      if (groups[node.type]) {
        groups[node.type].push(node);
      }
    });
    
    return groups;
  }, [nodes]);

  const orderedTypes: CausalNodeType[] = ['intent', 'decision', 'task', 'execution', 'outcome', 'insight'];

  return (
    <div className={`${className}`}>
      {/* Flow Layout */}
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {orderedTypes.map((type, typeIndex) => {
          const typeNodes = nodesByType[type];
          if (typeNodes.length === 0) return null;
          
          const config = NODE_CONFIG[type];
          
          return (
            <div key={type} className="flex items-center">
              {/* Column of nodes */}
              <div className="flex flex-col gap-3 min-w-[200px]">
                {/* Type header */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
                  <config.icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">({typeNodes.length})</span>
                </div>
                
                {/* Nodes */}
                {typeNodes.map(node => (
                  <GraphNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onClick={() => onNodeSelect(selectedNodeId === node.id ? null : node.id)}
                    edges={edges.filter(e => e.source === node.id || e.target === node.id)}
                  />
                ))}
              </div>
              
              {/* Arrow to next column */}
              {typeIndex < orderedTypes.length - 1 && nodesByType[orderedTypes[typeIndex + 1]]?.length > 0 && (
                <div className="flex items-center px-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-[var(--border-bright)] to-transparent" />
                  <ChevronRight className="w-4 h-4 text-[var(--text-ghost)] -ml-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <GraphLegend className="mt-6" />
    </div>
  );
}

interface GraphNodeProps {
  node: CausalNode;
  isSelected: boolean;
  onClick: () => void;
  edges: CausalEdge[];
}

export function GraphNode({ node, isSelected, onClick, edges }: GraphNodeProps) {
  const config = NODE_CONFIG[node.type];
  const Icon = config.icon;
  
  const incomingCount = edges.filter(e => e.target === node.id).length;
  const outgoingCount = edges.filter(e => e.source === node.id).length;

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl text-left transition-all duration-300 group
        ${isSelected 
          ? `${config.bgColor} ${config.borderColor} border-2 scale-[1.02] shadow-lg` 
          : 'bg-[var(--void-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
      `}
    >
      {/* Node content */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{node.title}</p>
          {node.description && (
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{node.description}</p>
          )}
          
          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-2">
            <AgencyIcon agentType={node.agency} size="sm" />
            {node.confidence && (
              <ConfidenceIndicator level={node.confidence} />
            )}
            <span className="text-xs text-[var(--text-ghost)]">
              {incomingCount > 0 && `${incomingCount} in`}
              {incomingCount > 0 && outgoingCount > 0 && ' · '}
              {outgoingCount > 0 && `${outgoingCount} out`}
            </span>
          </div>
        </div>
      </div>

      {/* Connection indicators */}
      {incomingCount > 0 && (
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--cosmic-cyan)]" />
      )}
      {outgoingCount > 0 && (
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--cosmic-purple)]" />
      )}
    </button>
  );
}

interface GraphLegendProps {
  className?: string;
}

export function GraphLegend({ className = '' }: GraphLegendProps) {
  return (
    <div className={`p-4 rounded-xl bg-[var(--void-surface)] border border-[var(--border-subtle)] ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">Understanding the System Map</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(NODE_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md ${config.bgColor} flex items-center justify-center`}>
              <config.icon className={`w-3 h-3 ${config.color}`} />
            </div>
            <span className="text-xs text-[var(--text-muted)]">{config.label}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-[var(--text-muted)]">Human action</span>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-[var(--text-muted)]">AI action</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-[var(--text-muted)]">High confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-xs text-[var(--text-muted)]">Low confidence</span>
        </div>
      </div>
    </div>
  );
}

// Node detail panel when selected
interface NodeDetailPanelProps {
  node: CausalNode;
  edges: CausalEdge[];
  allNodes: CausalNode[];
  onClose: () => void;
}

export function NodeDetailPanel({ node, edges, allNodes, onClose }: NodeDetailPanelProps) {
  const config = NODE_CONFIG[node.type];
  const Icon = config.icon;
  
  const incomingEdges = edges.filter(e => e.target === node.id);
  const outgoingEdges = edges.filter(e => e.source === node.id);
  
  const getNodeById = (id: string) => allNodes.find(n => n.id === id);

  return (
    <div className="w-80 bg-[var(--void-surface)] border-l border-[var(--border-subtle)] p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${config.color} uppercase tracking-wider`}>{config.label}</p>
          <h3 className="text-lg font-bold text-white mt-0.5">{node.title}</h3>
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-4">{node.description}</p>
      )}

      {/* Metadata */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Agency</span>
          <AgencyIcon agentType={node.agency} />
        </div>
        {node.confidence && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Confidence</span>
            <ConfidenceIndicator level={node.confidence} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Status</span>
          <span className="text-xs text-[var(--text-secondary)]">{node.status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Created</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {new Date(node.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Connections */}
      {incomingEdges.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Caused by</p>
          <div className="space-y-2">
            {incomingEdges.map(edge => {
              const sourceNode = getNodeById(edge.source);
              if (!sourceNode) return null;
              const sourceConfig = NODE_CONFIG[sourceNode.type];
              
              return (
                <div 
                  key={edge.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--void-elevated)]"
                >
                  <sourceConfig.icon className={`w-4 h-4 ${sourceConfig.color}`} />
                  <span className="text-xs text-[var(--text-primary)] truncate">{sourceNode.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {outgoingEdges.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Led to</p>
          <div className="space-y-2">
            {outgoingEdges.map(edge => {
              const targetNode = getNodeById(edge.target);
              if (!targetNode) return null;
              const targetConfig = NODE_CONFIG[targetNode.type];
              
              return (
                <div 
                  key={edge.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--void-elevated)]"
                >
                  <targetConfig.icon className={`w-4 h-4 ${targetConfig.color}`} />
                  <span className="text-xs text-[var(--text-primary)] truncate">{targetNode.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CausalGraph;

