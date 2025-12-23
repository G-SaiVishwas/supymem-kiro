import React, { createContext, useContext, useState, useCallback } from 'react';

interface TimeContextType {
  // Time travel state
  isTimeTraveling: boolean;
  viewingTimestamp: Date | null;
  
  // Controls
  enterTimeTravel: (timestamp: Date) => void;
  exitTimeTravel: () => void;
  setViewingTime: (timestamp: Date) => void;
  
  // Time bounds (for the scrubber)
  minTimestamp: Date;
  maxTimestamp: Date;
  
  // Utilities
  formatRelativeTime: (date: Date | string) => string;
  isHistorical: (date: Date | string) => boolean;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

// Default to last 90 days
const DEFAULT_MIN_TIMESTAMP = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const DEFAULT_MAX_TIMESTAMP = new Date();

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [viewingTimestamp, setViewingTimestamp] = useState<Date | null>(null);
  const [minTimestamp] = useState(DEFAULT_MIN_TIMESTAMP);
  const [maxTimestamp] = useState(DEFAULT_MAX_TIMESTAMP);

  const enterTimeTravel = useCallback((timestamp: Date) => {
    setIsTimeTraveling(true);
    setViewingTimestamp(timestamp);
  }, []);

  const exitTimeTravel = useCallback(() => {
    setIsTimeTraveling(false);
    setViewingTimestamp(null);
  }, []);

  const setViewingTime = useCallback((timestamp: Date) => {
    if (isTimeTraveling) {
      setViewingTimestamp(timestamp);
    }
  }, [isTimeTraveling]);

  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = viewingTimestamp || new Date();
    const diff = now.getTime() - d.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return d.toLocaleDateString();
  }, [viewingTimestamp]);

  const isHistorical = useCallback((date: Date | string): boolean => {
    if (!isTimeTraveling || !viewingTimestamp) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d > viewingTimestamp;
  }, [isTimeTraveling, viewingTimestamp]);

  const value: TimeContextType = {
    isTimeTraveling,
    viewingTimestamp,
    enterTimeTravel,
    exitTimeTravel,
    setViewingTime,
    minTimestamp,
    maxTimestamp,
    formatRelativeTime,
    isHistorical,
  };

  return (
    <TimeContext.Provider value={value}>
      {children}
    </TimeContext.Provider>
  );
}

export function useTime() {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
}

// Hook for components that need to respect time travel
export function useEffectiveTimestamp() {
  const { isTimeTraveling, viewingTimestamp } = useTime();
  return isTimeTraveling && viewingTimestamp ? viewingTimestamp : new Date();
}

// Hook to format dates relative to viewing time
export function useRelativeTime() {
  const { formatRelativeTime, isHistorical } = useTime();
  return { formatRelativeTime, isHistorical };
}

