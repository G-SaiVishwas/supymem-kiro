import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardMode = 'software' | 'hardware';

interface DashboardModeContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  toggleMode: () => void;
}

const DashboardModeContext = createContext<DashboardModeContextType | undefined>(undefined);

const MODE_KEY = 'dashboard_mode';

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode>(() => {
    const stored = localStorage.getItem(MODE_KEY);
    return (stored as DashboardMode) || 'software';
  });

  const setMode = (newMode: DashboardMode) => {
    localStorage.setItem(MODE_KEY, newMode);
    setModeState(newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'software' ? 'hardware' : 'software';
    setMode(newMode);
  };

  return (
    <DashboardModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (context === undefined) {
    throw new Error('useDashboardMode must be used within a DashboardModeProvider');
  }
  return context;
}

