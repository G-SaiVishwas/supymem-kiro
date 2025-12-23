// API Types

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  team_id: string;
  assigned_to: string | null;
  created_by: string | null;
  source: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Decision {
  id: string;
  title: string;
  summary: string | null;
  reasoning: string | null;
  decided_by: string | null;
  created_at: string;
  source_type: string | null;
  source_url: string | null;
  category: string | null;
  importance: string | null;
  alternatives_considered: Alternative[];
}

export interface Alternative {
  option: string;
  pros?: string[];
  cons?: string[];
  rejected_reason?: string;
}

export interface ChallengeResult {
  challenge_id: string;
  decision_found: boolean;
  decision: Decision | null;
  original_reasoning: string;
  related_discussions: RelatedDiscussion[];
  ai_analysis: string;
  alternatives_considered: Alternative[];
  suggested_alternatives: string[];
  confidence: number;
}

export interface RelatedDiscussion {
  id: string | null;
  content: string;
  source: string | null;
  score: number | null;
}

export interface AutomationRule {
  id: string;
  team_id: string;
  created_by: string;
  description: string;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  action_type: string;
  action_params: Record<string, unknown>;
  status: string;
  is_one_time: boolean;
  execution_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  related_files: string[];
  related_repo: string | null;
  lines_added: number;
  lines_removed: number;
  timestamp: string;
}

export interface UserProductivity {
  user_identifier: string;
  period_start: string;
  period_end: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  prs_reviewed: number;
  tasks_completed: number;
  tasks_created: number;
  lines_added: number;
  lines_removed: number;
  files_changed: number;
  knowledge_entries: number;
  decisions_made: number;
  productivity_score: number;
  activity_trend: 'increasing' | 'stable' | 'decreasing';
  most_active_day: string | null;
}

export interface TeamProductivity {
  team_id: string;
  period_start: string;
  period_end: string;
  active_users: number;
  user_rankings: UserRanking[];
  totals: TeamTotals;
}

export interface UserRanking {
  user: string;
  productivity_score: number;
  commits: number;
  prs_merged: number;
  tasks_completed: number;
  lines_added: number;
  trend: string;
}

export interface TeamTotals {
  total_commits: number;
  total_prs_merged: number;
  total_tasks_completed: number;
  total_lines_added: number;
  average_productivity: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  source_url: string | null;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export interface QueryResponse {
  response: string;
  sources: Array<{ content: string; source: string }> | null;
}

