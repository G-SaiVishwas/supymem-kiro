import { useOnboarding } from '../contexts/OnboardingContext';
import type { UserMode } from '../types';

const MODE_HIERARCHY: Record<UserMode, number> = {
  'observer': 0,
  'participant': 1,
  'controller': 2,
};

const FEATURE_REQUIREMENTS: Record<string, UserMode> = {
  // Observer features (available to all)
  'view_dashboard': 'observer',
  'view_tasks': 'observer',
  'view_decisions': 'observer',
  'view_analytics': 'observer',
  'ask_agent': 'observer',
  'view_system_map': 'observer',
  'view_org_health': 'observer',
  
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
  'time_travel': 'controller',
};

/**
 * Hook to check if a feature is available for the current user mode
 */
export function useFeatureGate(featureId: string) {
  const { currentMode, markFeatureUsed } = useOnboarding();
  
  const requiredMode = FEATURE_REQUIREMENTS[featureId] || 'observer';
  const available = MODE_HIERARCHY[currentMode] >= MODE_HIERARCHY[requiredMode];
  
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

/**
 * Hook to check if user meets minimum mode requirement
 */
export function useMinimumMode(requiredMode: UserMode) {
  const { currentMode } = useOnboarding();
  return MODE_HIERARCHY[currentMode] >= MODE_HIERARCHY[requiredMode];
}

/**
 * Hook for gating controller-only features
 */
export function useControllerFeature(featureId: string) {
  const gate = useFeatureGate(featureId);
  const isController = useMinimumMode('controller');
  
  return {
    ...gate,
    isController,
  };
}

export default useFeatureGate;

