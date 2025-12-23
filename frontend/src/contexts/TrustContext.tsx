import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TrustPolicy, DataVisibility, ConfidenceLevel } from '../types';

interface TrustContextType {
  // Display preferences
  showConfidenceBadges: boolean;
  setShowConfidenceBadges: (show: boolean) => void;
  showAgencyBadges: boolean;
  setShowAgencyBadges: (show: boolean) => void;
  showSourceAttribution: boolean;
  setShowSourceAttribution: (show: boolean) => void;
  
  // Trust policies
  trustPolicies: TrustPolicy[];
  isLoadingPolicies: boolean;
  updatePolicy: (policyId: string, enabled: boolean) => Promise<void>;
  
  // Data visibility
  dataVisibility: DataVisibility[];
  
  // Confidence thresholds
  minConfidenceToShow: ConfidenceLevel;
  setMinConfidenceToShow: (level: ConfidenceLevel) => void;
  shouldShowByConfidence: (level: ConfidenceLevel) => boolean;
  
  // Trust panel
  isTrustPanelOpen: boolean;
  openTrustPanel: () => void;
  closeTrustPanel: () => void;
}

const TrustContext = createContext<TrustContextType | undefined>(undefined);

const PREFS_KEY = 'supymem_trust_prefs';

const CONFIDENCE_HIERARCHY: Record<ConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  verified: 3,
};

// Default trust policies
const defaultTrustPolicies: TrustPolicy[] = [
  {
    id: 'track-tasks',
    category: 'tracking',
    title: 'Task Activity',
    description: 'Track task creation, updates, and completion',
    enabled: true,
    user_controllable: false,
  },
  {
    id: 'track-decisions',
    category: 'tracking',
    title: 'Decision Recording',
    description: 'Capture and store team decisions from integrated sources',
    enabled: true,
    user_controllable: false,
  },
  {
    id: 'track-voice',
    category: 'tracking',
    title: 'Voice Notes',
    description: 'Transcribe and store voice recordings',
    enabled: true,
    user_controllable: true,
  },
  {
    id: 'ai-suggestions',
    category: 'usage',
    title: 'AI Suggestions',
    description: 'Use AI to suggest tasks, decisions, and insights',
    enabled: true,
    user_controllable: true,
  },
  {
    id: 'ai-automation',
    category: 'usage',
    title: 'AI Automation Execution',
    description: 'Allow AI to execute approved automations',
    enabled: true,
    user_controllable: true,
  },
  {
    id: 'never-performance',
    category: 'usage',
    title: 'Never Used for Performance Evaluation',
    description: 'Data is never used to evaluate individual performance',
    enabled: true,
    user_controllable: false,
  },
  {
    id: 'data-retention',
    category: 'retention',
    title: '90-Day Default Retention',
    description: 'Data older than 90 days is archived unless marked for retention',
    enabled: true,
    user_controllable: false,
  },
];

// Default data visibility rules
const defaultDataVisibility: DataVisibility[] = [
  {
    data_type: 'Your tasks',
    visible_to: ['self', 'team', 'managers'],
    description: 'Tasks assigned to you',
  },
  {
    data_type: 'Your voice notes',
    visible_to: ['self'],
    description: 'Private by default, you control sharing',
  },
  {
    data_type: 'Team decisions',
    visible_to: ['team', 'managers', 'admins'],
    description: 'Visible to all team members',
  },
  {
    data_type: 'Analytics data',
    visible_to: ['managers', 'admins'],
    description: 'Aggregate data, never individual tracking',
  },
  {
    data_type: 'Automation logs',
    visible_to: ['admins'],
    description: 'System logs for audit purposes',
  },
];

interface TrustPrefs {
  showConfidenceBadges: boolean;
  showAgencyBadges: boolean;
  showSourceAttribution: boolean;
  minConfidenceToShow: ConfidenceLevel;
}

const defaultPrefs: TrustPrefs = {
  showConfidenceBadges: true,
  showAgencyBadges: true,
  showSourceAttribution: true,
  minConfidenceToShow: 'low',
};

export function TrustProvider({ children }: { children: React.ReactNode }) {
  // Load preferences from localStorage
  const [prefs, setPrefs] = useState<TrustPrefs>(() => {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
  });
  
  const [trustPolicies, setTrustPolicies] = useState<TrustPolicy[]>(defaultTrustPolicies);
  const [dataVisibility] = useState<DataVisibility[]>(defaultDataVisibility);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [isTrustPanelOpen, setIsTrustPanelOpen] = useState(false);

  // Save preferences
  const savePrefs = useCallback((newPrefs: Partial<TrustPrefs>) => {
    const updated = { ...prefs, ...newPrefs };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  }, [prefs]);

  const setShowConfidenceBadges = useCallback((show: boolean) => {
    savePrefs({ showConfidenceBadges: show });
  }, [savePrefs]);

  const setShowAgencyBadges = useCallback((show: boolean) => {
    savePrefs({ showAgencyBadges: show });
  }, [savePrefs]);

  const setShowSourceAttribution = useCallback((show: boolean) => {
    savePrefs({ showSourceAttribution: show });
  }, [savePrefs]);

  const setMinConfidenceToShow = useCallback((level: ConfidenceLevel) => {
    savePrefs({ minConfidenceToShow: level });
  }, [savePrefs]);

  const shouldShowByConfidence = useCallback((level: ConfidenceLevel): boolean => {
    return CONFIDENCE_HIERARCHY[level] >= CONFIDENCE_HIERARCHY[prefs.minConfidenceToShow];
  }, [prefs.minConfidenceToShow]);

  const updatePolicy = useCallback(async (policyId: string, enabled: boolean) => {
    setIsLoadingPolicies(true);
    try {
      // TODO: API call to update policy
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setTrustPolicies(prev => 
        prev.map(p => p.id === policyId ? { ...p, enabled } : p)
      );
    } finally {
      setIsLoadingPolicies(false);
    }
  }, []);

  const openTrustPanel = useCallback(() => setIsTrustPanelOpen(true), []);
  const closeTrustPanel = useCallback(() => setIsTrustPanelOpen(false), []);

  const value: TrustContextType = {
    showConfidenceBadges: prefs.showConfidenceBadges,
    setShowConfidenceBadges,
    showAgencyBadges: prefs.showAgencyBadges,
    setShowAgencyBadges,
    showSourceAttribution: prefs.showSourceAttribution,
    setShowSourceAttribution,
    trustPolicies,
    isLoadingPolicies,
    updatePolicy,
    dataVisibility,
    minConfidenceToShow: prefs.minConfidenceToShow,
    setMinConfidenceToShow,
    shouldShowByConfidence,
    isTrustPanelOpen,
    openTrustPanel,
    closeTrustPanel,
  };

  return (
    <TrustContext.Provider value={value}>
      {children}
    </TrustContext.Provider>
  );
}

export function useTrust() {
  const context = useContext(TrustContext);
  if (context === undefined) {
    throw new Error('useTrust must be used within a TrustProvider');
  }
  return context;
}

// Convenience hooks
export function useConfidenceDisplay() {
  const { showConfidenceBadges, showSourceAttribution, shouldShowByConfidence } = useTrust();
  return { showBadges: showConfidenceBadges, showSources: showSourceAttribution, shouldShow: shouldShowByConfidence };
}

export function useAgencyDisplay() {
  const { showAgencyBadges } = useTrust();
  return { showBadges: showAgencyBadges };
}

