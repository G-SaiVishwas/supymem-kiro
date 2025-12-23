import { useDashboardMode } from '../contexts/DashboardModeContext';
import Dashboard from '../pages/Dashboard';
import OmniDashboard from '../pages/OmniDashboard';

export default function SmartDashboard() {
  const { mode } = useDashboardMode();
  
  return mode === 'hardware' ? <OmniDashboard /> : <Dashboard />;
}

