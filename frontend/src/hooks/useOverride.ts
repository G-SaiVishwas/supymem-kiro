import { useState, useCallback } from 'react';
import type { Override, OverrideReason } from '../types';

interface UseOverrideOptions {
  entityId: string;
  entityType: string;
  onSuccess?: (override: Override) => void;
  onError?: (error: Error) => void;
}

interface OverrideSubmission {
  reason: OverrideReason;
  reasonText?: string;
  correction: string;
}

/**
 * Hook for managing override/disagreement functionality
 */
export function useOverride({ entityId, entityType, onSuccess, onError }: UseOverrideOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);

  const submitOverride = useCallback(async (data: OverrideSubmission) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newOverride: Override = {
        id: `override-${Date.now()}`,
        original_entity_id: entityId,
        original_entity_type: entityType,
        user_id: 'current-user', // Would come from auth context
        reason: data.reason,
        reason_text: data.reasonText,
        correction: data.correction,
        status: 'pending_review',
        created_at: new Date().toISOString(),
      };

      setOverrides(prev => [...prev, newOverride]);
      onSuccess?.(newOverride);
      
      return newOverride;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to submit override');
      setError(error.message);
      onError?.(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [entityId, entityType, onSuccess, onError]);

  const fetchOverrides = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock data
      setOverrides([]);
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
    }
  }, []);

  const hasOverrides = overrides.length > 0;
  const pendingCount = overrides.filter(o => o.status === 'pending_review').length;
  const acceptedCount = overrides.filter(o => o.status === 'accepted').length;

  return {
    overrides,
    isSubmitting,
    error,
    submitOverride,
    fetchOverrides,
    hasOverrides,
    pendingCount,
    acceptedCount,
  };
}

export default useOverride;

