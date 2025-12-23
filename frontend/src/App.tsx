import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardModeProvider } from './contexts/DashboardModeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Landing
import LandingPage from './pages/LandingPage';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// Software Mode pages (Original Supymem)
import Dashboard from './pages/Dashboard';
import AskAgent from './pages/AskAgent';
import Tasks from './pages/Tasks';
import Decisions from './pages/Decisions';
import Automations from './pages/Automations';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Team from './pages/Team';

// Hardware Mode pages (Omni Presence)
import OmniDashboard from './pages/OmniDashboard';
import Notes from './pages/Notes';
import Todos from './pages/Todos';
import Media from './pages/Media';
import Summaries from './pages/Summaries';

// Smart Dashboard component that renders based on mode
import SmartDashboard from './components/SmartDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing page - Mode selection */}
              <Route path="/welcome" element={<LandingPage />} />
              
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        {/* Smart Dashboard - renders based on mode */}
                        <Route path="/" element={<SmartDashboard />} />
                        
                        {/* Common routes */}
                        <Route path="/ask" element={<AskAgent />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route
                          path="/analytics"
                          element={
                            <ProtectedRoute requiredRoles={['owner', 'admin', 'manager']}>
                              <Analytics />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/team"
                          element={
                            <ProtectedRoute requiredRoles={['owner', 'admin', 'manager']}>
                              <Team />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Software Mode routes */}
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/decisions" element={<Decisions />} />
                        <Route path="/automations" element={<Automations />} />
                        
                        {/* Hardware Mode routes */}
                        <Route path="/notes" element={<Notes />} />
                        <Route path="/todos" element={<Todos />} />
                        <Route path="/media" element={<Media />} />
                        <Route path="/summaries" element={<Summaries />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DashboardModeProvider>
    </QueryClientProvider>
  );
}

export default App;
