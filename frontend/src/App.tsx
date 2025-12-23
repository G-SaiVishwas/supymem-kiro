import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SystemStateProvider } from './contexts/SystemStateContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { TimeProvider } from './contexts/TimeContext';
import { TrustProvider } from './contexts/TrustContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// Software Mode pages
import Dashboard from './pages/Dashboard';
import AskAgent from './pages/AskAgent';
import Tasks from './pages/Tasks';
import Decisions from './pages/Decisions';
import Automations from './pages/Automations';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Summaries from './pages/Summaries';

// System Understanding pages (new)
import SystemMap from './pages/SystemMap';
import OrgHealth from './pages/OrgHealth';
import Intents from './pages/Intents';
import Trust from './pages/Trust';

// Central Knowledge
import CentralKnowledge from './pages/CentralKnowledge';

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
      <TrustProvider>
        <TimeProvider>
          <SystemStateProvider>
            <AuthProvider>
              <OnboardingProvider>
                <BrowserRouter>
                  <Routes>
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
                              {/* Dashboard */}
                              <Route path="/" element={<Dashboard />} />
                              
                              {/* System Understanding routes (new) */}
                              <Route path="/system-map" element={<SystemMap />} />
                              <Route path="/health" element={<OrgHealth />} />
                              <Route path="/intents" element={<Intents />} />
                              <Route path="/trust" element={<Trust />} />
                              
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
                              
                              {/* Core routes */}
                              <Route path="/tasks" element={<Tasks />} />
                              <Route path="/decisions" element={<Decisions />} />
                              <Route path="/automations" element={<Automations />} />
                              <Route path="/summaries" element={<Summaries />} />
                              
                              {/* Central Knowledge - accessible to all, edit for manager+ */}
                              <Route path="/central-knowledge" element={<CentralKnowledge />} />
                            </Routes>
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </BrowserRouter>
              </OnboardingProvider>
            </AuthProvider>
          </SystemStateProvider>
        </TimeProvider>
      </TrustProvider>
    </QueryClientProvider>
  );
}

export default App;
