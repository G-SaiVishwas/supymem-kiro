import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Task,
  Decision,
  ChallengeResult,
  AutomationRule,
  Activity,
  UserProductivity,
  TeamProductivity,
  QueryResponse,
} from '../types';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Default team ID - can be configured via localStorage or env
export const getDefaultTeamId = (): string => {
  return localStorage.getItem('supymem_team_id') || 'team-demo-001';
};

export const setDefaultTeamId = (teamId: string): void => {
  localStorage.setItem('supymem_team_id', teamId);
};

// API Client class with auth support
class ApiClient {
  private token: string | null = null;
  private axios: AxiosInstance = axiosInstance;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.axios.defaults.headers.common['Authorization'];
    }
  }

  // =========================================================================
  // AUTH APIs
  // =========================================================================

  async login(email: string, password: string) {
    const { data } = await this.axios.post('/auth/login', { email, password });
    return data;
  }

  async register(email: string, password: string, name: string) {
    const { data } = await this.axios.post('/auth/register', { email, password, name });
    return data;
  }

  async getMe() {
    const { data } = await this.axios.get('/auth/me');
    return data;
  }

  async updateMe(updates: { name?: string; avatar_url?: string; dashboard_layout?: object }) {
    const { data } = await this.axios.patch('/auth/me', updates);
    return data;
  }

  async switchOrganization(orgId: string) {
    const { data } = await this.axios.post(`/auth/switch-org/${orgId}`);
    return data;
  }

  // =========================================================================
  // ORGANIZATION APIs
  // =========================================================================

  async getMyOrganizations() {
    const { data } = await this.axios.get('/auth/organizations');
    return data;
  }

  async createOrganization(name: string, slug: string, description?: string) {
    const { data } = await this.axios.post('/auth/organizations', { name, slug, description });
    return data;
  }

  async getOrganization(orgId: string) {
    const { data } = await this.axios.get(`/auth/organizations/${orgId}`);
    return data;
  }

  async getOrganizationMembers(orgId: string) {
    const { data } = await this.axios.get(`/auth/organizations/${orgId}/members`);
    return data;
  }

  async updateMemberRole(orgId: string, userId: string, role: string) {
    const { data } = await this.axios.patch(`/auth/organizations/${orgId}/members/${userId}/role`, { role });
    return data;
  }

  async removeMember(orgId: string, userId: string) {
    const { data } = await this.axios.delete(`/auth/organizations/${orgId}/members/${userId}`);
    return data;
  }

  // =========================================================================
  // TEAM APIs
  // =========================================================================

  async getTeams(orgId: string) {
    const { data } = await this.axios.get(`/auth/organizations/${orgId}/teams`);
    return data;
  }

  async createTeam(orgId: string, name: string, slug: string, description?: string) {
    const { data } = await this.axios.post(`/auth/organizations/${orgId}/teams`, { name, slug, description });
    return data;
  }

  async addTeamMember(orgId: string, teamId: string, userId: string) {
    const { data } = await this.axios.post(`/auth/organizations/${orgId}/teams/${teamId}/members/${userId}`);
    return data;
  }

  // =========================================================================
  // INVITE APIs
  // =========================================================================

  async createInvite(orgId: string, email: string, role: string, teamId?: string) {
    const { data } = await this.axios.post(`/auth/organizations/${orgId}/invites`, { email, role, team_id: teamId });
    return data;
  }

  async acceptInvite(token: string, name: string, password: string) {
    const { data } = await this.axios.post('/auth/invites/accept', { token, name, password });
    return data;
  }
}

export const api = new ApiClient();

// Keep legacy axios instance for backward compatibility
const legacyApi = axiosInstance;

// Knowledge APIs
export const queryKnowledge = async (query: string, teamId?: string): Promise<QueryResponse> => {
  const { data } = await legacyApi.post('/query', { query, team_id: teamId || getDefaultTeamId() });
  return data;
};

export const storeKnowledge = async (content: string, source: string, teamId?: string) => {
  const { data } = await legacyApi.post('/store', { content, source, team_id: teamId || getDefaultTeamId() });
  return data;
};

export const searchKnowledge = async (query: string, teamId?: string) => {
  const { data } = await legacyApi.post('/search', { query, team_id: teamId || getDefaultTeamId() });
  return data;
};

// Task APIs
export const getTasks = async (teamId?: string, status?: string): Promise<Task[]> => {
  const params = new URLSearchParams({ team_id: teamId || getDefaultTeamId() });
  if (status) params.append('status', status);
  const { data } = await legacyApi.get(`/tasks?${params}`);
  return data;
};

export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const { data } = await legacyApi.post('/tasks', task);
  return data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const { data } = await legacyApi.patch(`/tasks/${taskId}`, updates);
  return data;
};

export const deleteTask = async (taskId: string) => {
  const { data } = await legacyApi.delete(`/tasks/${taskId}`);
  return data;
};

// Decision APIs
export const getDecisions = async (teamId?: string): Promise<Decision[]> => {
  const { data } = await legacyApi.get(`/decisions?team_id=${teamId || getDefaultTeamId()}`);
  return data;
};

export const getDecision = async (decisionId: string): Promise<Decision> => {
  const { data } = await legacyApi.get(`/decisions/${decisionId}`);
  return data;
};

export const challengeDecision = async (
  question: string,
  teamId?: string,
  decisionId?: string
): Promise<ChallengeResult> => {
  const { data } = await legacyApi.post('/challenge', {
    question,
    team_id: teamId || getDefaultTeamId(),
    decision_id: decisionId,
  });
  return data;
};

// Automation APIs
export const getAutomationRules = async (teamId?: string): Promise<AutomationRule[]> => {
  const { data } = await legacyApi.get(`/automation/rules?team_id=${teamId || getDefaultTeamId()}`);
  return data;
};

export const parseAutomation = async (instruction: string, teamId?: string) => {
  const { data } = await legacyApi.post('/automation/parse', {
    instruction,
    team_id: teamId || getDefaultTeamId(),
  });
  return data;
};

export const createAutomation = async (instruction: string, teamId?: string) => {
  const { data } = await legacyApi.post('/automation/rules', {
    instruction,
    team_id: teamId || getDefaultTeamId(),
  });
  return data;
};

export const updateRuleStatus = async (ruleId: string, status: string) => {
  const { data } = await legacyApi.patch(`/automation/rules/${ruleId}/status?status=${status}`);
  return data;
};

export const deleteRule = async (ruleId: string) => {
  const { data } = await legacyApi.delete(`/automation/rules/${ruleId}`);
  return data;
};

// Analytics APIs
export const getActivities = async (user: string, teamId?: string): Promise<Activity[]> => {
  const { data } = await legacyApi.get(`/activities?user=${user}&team_id=${teamId || getDefaultTeamId()}`);
  return data;
};

export const getTeamActivities = async (teamId?: string, limit = 20): Promise<Activity[]> => {
  const { data } = await legacyApi.get(`/activities/team?team_id=${teamId || getDefaultTeamId()}&limit=${limit}`);
  return data;
};

export const getUserProductivity = async (
  user: string,
  teamId?: string,
  days = 7
): Promise<UserProductivity> => {
  const { data } = await legacyApi.get(`/productivity/user?user=${user}&team_id=${teamId || getDefaultTeamId()}&days=${days}`);
  return data;
};

export const getTeamProductivity = async (teamId?: string, days = 7): Promise<TeamProductivity> => {
  const { data } = await legacyApi.get(`/productivity/team?team_id=${teamId || getDefaultTeamId()}&days=${days}`);
  return data;
};

// GitHub Events APIs (for demo)
export interface GitHubEvent {
  id: string;
  event_type: string;
  action: string | null;
  repository: string;
  sender: string | null;
  pr_number: number | null;
  issue_number: number | null;
  processed: boolean;
  is_breaking_change: boolean;
  created_at: string;
  processing_result: Record<string, any> | null;
}

export interface FullDecision {
  id: string;
  title: string;
  summary: string | null;
  reasoning: string | null;
  alternatives_considered: Array<{
    option: string;
    pros?: string[];
    cons?: string[];
    rejected_reason?: string;
  }>;
  context: string | null;
  impact: string | null;
  source_type: string;
  source_id: string | null;
  source_url: string | null;
  decided_by: string | null;
  participants: string[];
  affected_files: string[];
  affected_components: string[];
  category: string | null;
  importance: string;
  created_at: string;
}

export const getGitHubEvents = async (repository?: string, limit = 20): Promise<GitHubEvent[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (repository) params.append('repository', repository);
  const { data } = await legacyApi.get(`/github-events?${params}`);
  return data;
};

export const getFullDecisions = async (teamId?: string, limit = 20): Promise<FullDecision[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (teamId) params.append('team_id', teamId);
  const { data } = await legacyApi.get(`/decisions-full?${params}`);
  return data;
};

export default legacyApi;

