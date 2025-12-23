import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserMode, OnboardingState, UpgradeRequirement } from '../types';
import { useAuth } from './AuthContext';

interface OnboardingContextType {
  // Current state
  currentMode: UserMode;
  onboardingState: OnboardingState | null;
  isLoading: boolean;
  
  // Mode management
  canUpgradeTo: UserMode | null;
  upgradeRequirements: UpgradeRequirement[];
  requestUpgrade: (targetMode: UserMode) => Promise<boolean>;
  
  // Feature gating
  isFeatureAvailable: (featureId: string) => boolean;
  markFeatureUsed: (featureId: string) => void;
  
  // Training
  completeTraining: (trainingId: string) => Promise<void>;
  hasCompletedTraining: (trainingId: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const MODE_KEY = 'supymem_user_mode';
const FEATURES_KEY = 'supymem_features_used';
const TRAINING_KEY = 'supymem_training_completed';
const FIRST_ACTIVE_KEY = 'supymem_first_active';

// Feature definitions by mode
const FEATURE_REQUIREMENTS: Record<string, UserMode> = {
  // Observer features (available to all)
  'view_dashboard': 'observer',
  'view_tasks': 'observer',
  'view_decisions': 'observer',
  'view_analytics': 'observer',
  'ask_agent': 'observer',
  
  // Participant features
  'create_task': 'participant',
  'update_task': 'participant',
  'add_note': 'participant',
  'record_voice': 'participant',
  'add_decision': 'participant',
  'override_insight': 'participant',
  
  // Controller features
  'create_automation': 'controller',
  'bulk_actions': 'controller',
  'create_intent': 'controller',
  'manage_lifecycle': 'controller',
  'configure_governance': 'controller',
  'manage_team': 'controller',
};

const MODE_HIERARCHY: Record<UserMode, number> = {
  'observer': 0,
  'participant': 1,
  'controller': 2,
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, currentOrg } = useAuth();
  const userRole = currentOrg?.role || 'member';
  
  const [currentMode, setCurrentMode] = useState<UserMode>(() => {
    const stored = localStorage.getItem(MODE_KEY);
    return (stored as UserMode) || 'observer';
  });
  
  const [featuresUsed, setFeaturesUsed] = useState<string[]>(() => {
    const stored = localStorage.getItem(FEATURES_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [trainingCompleted, setTrainingCompleted] = useState<string[]>(() => {
    const stored = localStorage.getItem(TRAINING_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [firstActiveDate] = useState<Date>(() => {
    const stored = localStorage.getItem(FIRST_ACTIVE_KEY);
    if (stored) return new Date(stored);
    const now = new Date();
    localStorage.setItem(FIRST_ACTIVE_KEY, now.toISOString());
    return now;
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Calculate days active
  const daysActive = Math.floor(
    (new Date().getTime() - firstActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine upgrade requirements
  const getUpgradeRequirements = useCallback((targetMode: UserMode): UpgradeRequirement[] => {
    const requirements: UpgradeRequirement[] = [];
    
    if (targetMode === 'participant') {
      requirements.push({
        id: 'days-active-3',
        description: 'Be active for at least 3 days',
        completed: daysActive >= 3,
        required_for: 'participant',
      });
      requirements.push({
        id: 'view-features',
        description: 'Explore dashboard, tasks, and decisions',
        completed: featuresUsed.includes('view_dashboard') && 
                   featuresUsed.includes('view_tasks') && 
                   featuresUsed.includes('view_decisions'),
        required_for: 'participant',
      });
    }
    
    if (targetMode === 'controller') {
      requirements.push({
        id: 'manager-role',
        description: 'Have manager or higher role',
        completed: ['owner', 'admin', 'manager'].includes(userRole),
        required_for: 'controller',
      });
      requirements.push({
        id: 'training-complete',
        description: 'Complete controller training module',
        completed: trainingCompleted.includes('controller-training'),
        required_for: 'controller',
      });
      requirements.push({
        id: 'participant-mode',
        description: 'Have used participant mode features',
        completed: featuresUsed.includes('create_task') || featuresUsed.includes('add_note'),
        required_for: 'controller',
      });
    }
    
    return requirements;
  }, [daysActive, featuresUsed, trainingCompleted, userRole]);

  // Determine what mode user can upgrade to
  const canUpgradeTo = useCallback((): UserMode | null => {
    if (currentMode === 'controller') return null;
    
    const nextMode: UserMode = currentMode === 'observer' ? 'participant' : 'controller';
    const requirements = getUpgradeRequirements(nextMode);
    const allMet = requirements.every(r => r.completed);
    
    return allMet ? nextMode : null;
  }, [currentMode, getUpgradeRequirements]);

  // Check if a feature is available for current mode
  const isFeatureAvailable = useCallback((featureId: string): boolean => {
    const requiredMode = FEATURE_REQUIREMENTS[featureId];
    if (!requiredMode) return true; // Unknown features are available
    
    return MODE_HIERARCHY[currentMode] >= MODE_HIERARCHY[requiredMode];
  }, [currentMode]);

  // Mark a feature as used
  const markFeatureUsed = useCallback((featureId: string) => {
    if (!featuresUsed.includes(featureId)) {
      const updated = [...featuresUsed, featureId];
      setFeaturesUsed(updated);
      localStorage.setItem(FEATURES_KEY, JSON.stringify(updated));
    }
  }, [featuresUsed]);

  // Request mode upgrade
  const requestUpgrade = useCallback(async (targetMode: UserMode): Promise<boolean> => {
    setIsLoading(true);
    try {
      const requirements = getUpgradeRequirements(targetMode);
      const allMet = requirements.every(r => r.completed);
      
      if (!allMet) {
        return false;
      }
      
      // TODO: API call to record mode upgrade
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentMode(targetMode);
      localStorage.setItem(MODE_KEY, targetMode);
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [getUpgradeRequirements]);

  // Complete training
  const completeTraining = useCallback(async (trainingId: string) => {
    setIsLoading(true);
    try {
      // TODO: API call to record training completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updated = [...trainingCompleted, trainingId];
      setTrainingCompleted(updated);
      localStorage.setItem(TRAINING_KEY, JSON.stringify(updated));
    } finally {
      setIsLoading(false);
    }
  }, [trainingCompleted]);

  const hasCompletedTraining = useCallback((trainingId: string): boolean => {
    return trainingCompleted.includes(trainingId);
  }, [trainingCompleted]);

  // Build onboarding state
  const onboardingState: OnboardingState = {
    current_mode: currentMode,
    mode_unlocked_at: {
      observer: firstActiveDate.toISOString(),
      participant: currentMode !== 'observer' ? new Date().toISOString() : null,
      controller: currentMode === 'controller' ? new Date().toISOString() : null,
    },
    features_used: featuresUsed,
    days_active: daysActive,
    training_completed: trainingCompleted,
    can_upgrade_to: canUpgradeTo(),
    upgrade_requirements: canUpgradeTo() ? getUpgradeRequirements(canUpgradeTo()!) : [],
  };

  const value: OnboardingContextType = {
    currentMode,
    onboardingState,
    isLoading,
    canUpgradeTo: canUpgradeTo(),
    upgradeRequirements: canUpgradeTo() ? getUpgradeRequirements(canUpgradeTo()!) : [],
    requestUpgrade,
    isFeatureAvailable,
    markFeatureUsed,
    completeTraining,
    hasCompletedTraining,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// Convenience hook for feature gating
export function useFeatureGate(featureId: string) {
  const { isFeatureAvailable, markFeatureUsed, currentMode } = useOnboarding();
  const available = isFeatureAvailable(featureId);
  const requiredMode = FEATURE_REQUIREMENTS[featureId] || 'observer';
  
  return {
    available,
    currentMode,
    requiredMode,
    use: () => {
      if (available) {
        markFeatureUsed(featureId);
      }
    },
  };
}

// Hook to check if user is in a specific mode or higher
export function useMinimumMode(requiredMode: UserMode) {
  const { currentMode } = useOnboarding();
  return MODE_HIERARCHY[currentMode] >= MODE_HIERARCHY[requiredMode];
}

