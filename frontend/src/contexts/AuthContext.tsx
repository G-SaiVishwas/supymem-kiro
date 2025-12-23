import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_email_verified: boolean;
  current_org_id?: string;
  current_team_id?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'supymem_token';
const USER_KEY = 'supymem_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    if (!token) return;
    try {
      const orgs = await api.getMyOrganizations();
      setOrganizations(orgs);
      
      // Set current org
      if (orgs.length > 0) {
        const current = orgs.find((o: Organization) => o.id === user?.current_org_id) || orgs[0];
        setCurrentOrg(current);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  }, [token, user?.current_org_id]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        api.setToken(token);
        try {
          const userData = await api.getMe();
          setUser(userData);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          await fetchOrganizations();
        } catch (error) {
          // Token invalid, clear auth
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token, fetchOrganizations]);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    const { access_token, user: userData } = response;
    
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    api.setToken(access_token);
    setToken(access_token);
    setUser(userData);
    
    // Fetch organizations after login
    const orgs = await api.getMyOrganizations();
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.register(email, password, name);
    const { access_token, user: userData } = response;
    
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    api.setToken(access_token);
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    api.setToken(null);
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  const switchOrganization = async (orgId: string) => {
    const response = await api.switchOrganization(orgId);
    const { access_token, user: userData } = response;
    
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    api.setToken(access_token);
    setToken(access_token);
    setUser(userData);
    
    const org = organizations.find(o => o.id === orgId);
    setCurrentOrg(org || null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const userData = await api.getMe();
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    organizations,
    currentOrg,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    switchOrganization,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to check roles
export function useHasRole(allowedRoles: string[]) {
  const { currentOrg } = useAuth();
  return currentOrg ? allowedRoles.includes(currentOrg.role) : false;
}

export function useIsAdmin() {
  return useHasRole(['owner', 'admin']);
}

export function useIsManager() {
  return useHasRole(['owner', 'admin', 'manager']);
}

