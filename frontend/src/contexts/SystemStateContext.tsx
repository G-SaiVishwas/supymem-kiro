import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  OrgHealth, 
  CausalGraph, 
  SystemHealth, 
  HealthCheck 
} from '../types';

interface SystemStateContextType {
  // Org Health
  orgHealth: OrgHealth | null;
  isLoadingOrgHealth: boolean;
  refreshOrgHealth: () => Promise<void>;
  
  // Causal Graph
  causalGraph: CausalGraph | null;
  isLoadingGraph: boolean;
  refreshCausalGraph: () => Promise<void>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // System Health (status indicators)
  systemHealth: SystemHealth | null;
  isLoadingSystemHealth: boolean;
  refreshSystemHealth: () => Promise<void>;
}

const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

// Mock data - replace with actual API calls
const mockOrgHealth: OrgHealth = {
  alignment_score: 87,
  alignment_trend: 'up',
  decision_stability: 92,
  decision_stability_trend: 'stable',
  execution_confidence: 78,
  execution_confidence_trend: 'up',
  risk_hotspots: [
    {
      id: 'risk-1',
      title: 'Auth refactor blocked',
      description: '2 unresolved decisions blocking progress',
      severity: 'medium',
      related_entities: [
        { type: 'decision', id: 'd-1', title: 'OAuth provider selection' },
        { type: 'decision', id: 'd-2', title: 'Session storage strategy' },
      ],
      suggested_action: 'Schedule decision review meeting',
    },
  ],
  wins: [
    {
      id: 'win-1',
      title: '12 decisions resolved this week',
      description: 'Team velocity improved by 15%',
      achieved_at: new Date().toISOString(),
    },
    {
      id: 'win-2',
      title: 'Zero overrides needed',
      description: 'AI suggestions aligned with team decisions',
      achieved_at: new Date().toISOString(),
    },
  ],
  last_updated: new Date().toISOString(),
};

const mockSystemHealth: SystemHealth = {
  overall_status: 'healthy',
  checks: [
    { id: 'conflicts', name: 'No conflicts detected', description: 'All entities in consistent state', status: 'ok', checked_at: new Date().toISOString() },
    { id: 'deps', name: 'All dependencies resolved', description: 'No blocking dependencies', status: 'ok', checked_at: new Date().toISOString() },
    { id: 'approvals', name: 'No pending approvals', description: 'All items reviewed', status: 'ok', checked_at: new Date().toISOString() },
    { id: 'automations', name: 'Automations running smoothly', description: 'No errors in last 24h', status: 'ok', checked_at: new Date().toISOString() },
  ],
  attention_count: 0,
  last_checked: new Date().toISOString(),
};

const mockCausalGraph: CausalGraph = {
  nodes: [
    { id: 'intent-1', type: 'intent', title: 'Ship v2.0 by Q1', status: 'active', agency: 'human', confidence: 'high', timestamp: new Date().toISOString(), entity_id: 'i-1' },
    { id: 'decision-1', type: 'decision', title: 'Use React 19', status: 'decided', agency: 'human', confidence: 'verified', timestamp: new Date().toISOString(), entity_id: 'd-1' },
    { id: 'task-1', type: 'task', title: 'Upgrade dependencies', status: 'completed', agency: 'human', confidence: 'high', timestamp: new Date().toISOString(), entity_id: 't-1' },
    { id: 'execution-1', type: 'execution', title: 'Dependencies upgraded', status: 'done', agency: 'ai', confidence: 'verified', timestamp: new Date().toISOString(), entity_id: 'e-1' },
    { id: 'outcome-1', type: 'outcome', title: 'Build time reduced 20%', status: 'measured', agency: 'ai', confidence: 'medium', timestamp: new Date().toISOString(), entity_id: 'o-1' },
    { id: 'insight-1', type: 'insight', title: 'React 19 compiler further optimizes builds', status: 'suggested', agency: 'ai', confidence: 'medium', timestamp: new Date().toISOString(), entity_id: 'in-1' },
  ],
  edges: [
    { id: 'e1', source: 'intent-1', target: 'decision-1', relationship: 'caused', strength: 90, agency: 'human' },
    { id: 'e2', source: 'decision-1', target: 'task-1', relationship: 'caused', strength: 100, agency: 'human' },
    { id: 'e3', source: 'task-1', target: 'execution-1', relationship: 'enabled', strength: 100, agency: 'ai' },
    { id: 'e4', source: 'execution-1', target: 'outcome-1', relationship: 'caused', strength: 85, agency: 'ai' },
    { id: 'e5', source: 'outcome-1', target: 'insight-1', relationship: 'informed', strength: 70, agency: 'ai' },
  ],
  last_updated: new Date().toISOString(),
};

export function SystemStateProvider({ children }: { children: React.ReactNode }) {
  const [orgHealth, setOrgHealth] = useState<OrgHealth | null>(null);
  const [isLoadingOrgHealth, setIsLoadingOrgHealth] = useState(false);
  
  const [causalGraph, setCausalGraph] = useState<CausalGraph | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoadingSystemHealth, setIsLoadingSystemHealth] = useState(false);

  const refreshOrgHealth = useCallback(async () => {
    setIsLoadingOrgHealth(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrgHealth(mockOrgHealth);
    } catch (error) {
      console.error('Failed to fetch org health:', error);
    } finally {
      setIsLoadingOrgHealth(false);
    }
  }, []);

  const refreshCausalGraph = useCallback(async () => {
    setIsLoadingGraph(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setCausalGraph(mockCausalGraph);
    } catch (error) {
      console.error('Failed to fetch causal graph:', error);
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  const refreshSystemHealth = useCallback(async () => {
    setIsLoadingSystemHealth(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setSystemHealth(mockSystemHealth);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setIsLoadingSystemHealth(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshSystemHealth();
    refreshOrgHealth();
  }, [refreshSystemHealth, refreshOrgHealth]);

  const value: SystemStateContextType = {
    orgHealth,
    isLoadingOrgHealth,
    refreshOrgHealth,
    causalGraph,
    isLoadingGraph,
    refreshCausalGraph,
    selectedNodeId,
    setSelectedNodeId,
    systemHealth,
    isLoadingSystemHealth,
    refreshSystemHealth,
  };

  return (
    <SystemStateContext.Provider value={value}>
      {children}
    </SystemStateContext.Provider>
  );
}

export function useSystemState() {
  const context = useContext(SystemStateContext);
  if (context === undefined) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }
  return context;
}

export function useOrgHealth() {
  const { orgHealth, isLoadingOrgHealth, refreshOrgHealth } = useSystemState();
  return { orgHealth, isLoading: isLoadingOrgHealth, refresh: refreshOrgHealth };
}

export function useCausalGraph() {
  const { causalGraph, isLoadingGraph, refreshCausalGraph, selectedNodeId, setSelectedNodeId } = useSystemState();
  return { 
    graph: causalGraph, 
    isLoading: isLoadingGraph, 
    refresh: refreshCausalGraph,
    selectedNodeId,
    setSelectedNodeId,
  };
}

export function useSystemHealth() {
  const { systemHealth, isLoadingSystemHealth, refreshSystemHealth } = useSystemState();
  return { health: systemHealth, isLoading: isLoadingSystemHealth, refresh: refreshSystemHealth };
}

