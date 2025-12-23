import { useSystemHealth as useSystemHealthContext } from '../contexts/SystemStateContext';

/**
 * Re-export the system health hook from context for convenience
 * This allows for future extension without changing import paths
 */
export { useSystemHealth } from '../contexts/SystemStateContext';

/**
 * Hook to check if system is in healthy state
 */
export function useIsSystemHealthy() {
  const { health } = useSystemHealthContext();
  return health?.overall_status === 'healthy';
}

/**
 * Hook to get count of items needing attention
 */
export function useAttentionCount() {
  const { health } = useSystemHealthContext();
  return health?.attention_count || 0;
}

export default useSystemHealthContext;

