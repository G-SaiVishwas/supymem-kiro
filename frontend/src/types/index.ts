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

// ═══════════════════════════════════════════════════════════════
// 🧠 SYSTEM UNDERSTANDING TYPES
// ═══════════════════════════════════════════════════════════════

// Intent Objects - First-class goal tracking
export interface Intent {
  id: string;
  title: string;
  description: string;
  goal: string;
  constraints: Constraint[];
  values: Value[];
  risk_tolerance: 'low' | 'moderate' | 'high' | 'aggressive';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  version: number;
  parent_intent_id: string | null;
  created_by: string;
  team_id: string;
  created_at: string;
  updated_at: string;
  linked_decisions: string[];
  linked_tasks: string[];
}

export interface Constraint {
  id: string;
  text: string;
  type: 'hard' | 'soft';
  priority: number;
}

export interface Value {
  id: string;
  text: string;
  weight: number; // 0-100
}

export interface IntentVersion {
  version: number;
  changes: string;
  changed_by: string;
  changed_at: string;
  snapshot: Partial<Intent>;
}

// ═══════════════════════════════════════════════════════════════
// 🤖 AGENCY TRACKING TYPES
// ═══════════════════════════════════════════════════════════════

export type AgentType = 'human' | 'ai';
export type ActionType = 'initiated' | 'proposed' | 'executed' | 'approved' | 'rejected' | 'overridden';

export interface AgencyRecord {
  id: string;
  entity_id: string;
  entity_type: 'task' | 'decision' | 'automation' | 'insight' | 'intent';
  agent_type: AgentType;
  action_type: ActionType;
  agent_id: string; // user_id or 'system' for AI
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// 📊 CONFIDENCE & TRUST TYPES
// ═══════════════════════════════════════════════════════════════

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

export interface ConfidenceMetadata {
  entity_id: string;
  entity_type: string;
  confidence_level: ConfidenceLevel;
  confidence_score: number; // 0-100
  sources: ConfidenceSource[];
  reasoning: string;
  last_verified: string | null;
  verified_by: string | null;
}

export interface ConfidenceSource {
  id: string;
  type: 'slack' | 'github' | 'jira' | 'notion' | 'manual' | 'voice' | 'image' | 'document';
  name: string;
  url?: string;
  relevance_score: number; // 0-100
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// 🛑 OVERRIDE & FEEDBACK TYPES
// ═══════════════════════════════════════════════════════════════

export type OverrideReason = 
  | 'factually_incorrect'
  | 'missing_context'
  | 'correlation_not_causation'
  | 'outdated'
  | 'misattributed'
  | 'other';

export interface Override {
  id: string;
  original_entity_id: string;
  original_entity_type: string;
  user_id: string;
  reason: OverrideReason;
  reason_text?: string;
  correction: string;
  status: 'pending_review' | 'accepted' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface Disagreement {
  id: string;
  entity_id: string;
  entity_type: string;
  user_id: string;
  content: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 🧹 MEMORY LIFECYCLE TYPES
// ═══════════════════════════════════════════════════════════════

export type DecayPolicy = 'never' | 'after_30_days' | 'after_90_days' | 'after_1_year' | 'custom';

export interface MemoryLifecycle {
  entity_id: string;
  entity_type: string;
  decay_policy: DecayPolicy;
  expires_at: string | null;
  archived: boolean;
  archived_at: string | null;
  forget_requested: boolean;
  forget_requested_at: string | null;
  forget_requested_by: string | null;
}

export interface LifecyclePolicy {
  entity_type: string;
  default_decay: DecayPolicy;
  auto_archive_after_days: number | null;
  require_approval_for_delete: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🌌 ORG HEALTH TYPES
// ═══════════════════════════════════════════════════════════════

export interface OrgHealth {
  alignment_score: number; // 0-100
  alignment_trend: 'up' | 'stable' | 'down';
  decision_stability: number; // 0-100
  decision_stability_trend: 'up' | 'stable' | 'down';
  execution_confidence: number; // 0-100
  execution_confidence_trend: 'up' | 'stable' | 'down';
  risk_hotspots: RiskHotspot[];
  wins: OrgWin[];
  last_updated: string;
}

export interface RiskHotspot {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  related_entities: { type: string; id: string; title: string }[];
  suggested_action?: string;
}

export interface OrgWin {
  id: string;
  title: string;
  description: string;
  achieved_at: string;
  related_intent_id?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🧠 CAUSAL GRAPH TYPES
// ═══════════════════════════════════════════════════════════════

export type CausalNodeType = 'intent' | 'decision' | 'task' | 'execution' | 'outcome' | 'insight';

export interface CausalNode {
  id: string;
  type: CausalNodeType;
  title: string;
  description?: string;
  status: string;
  agency: AgentType;
  confidence?: ConfidenceLevel;
  timestamp: string;
  entity_id: string;
  position?: { x: number; y: number };
}

export interface CausalEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'caused' | 'influenced' | 'blocked' | 'enabled' | 'informed';
  strength: number; // 0-100
  agency: AgentType;
  metadata?: Record<string, unknown>;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  last_updated: string;
}

// ═══════════════════════════════════════════════════════════════
// 🎓 ONBOARDING & PROGRESSIVE DISCLOSURE TYPES
// ═══════════════════════════════════════════════════════════════

export type UserMode = 'observer' | 'participant' | 'controller';

export interface OnboardingState {
  current_mode: UserMode;
  mode_unlocked_at: Record<UserMode, string | null>;
  features_used: string[];
  days_active: number;
  training_completed: string[];
  can_upgrade_to: UserMode | null;
  upgrade_requirements: UpgradeRequirement[];
}

export interface UpgradeRequirement {
  id: string;
  description: string;
  completed: boolean;
  required_for: UserMode;
}

// ═══════════════════════════════════════════════════════════════
// ⏳ TEMPORAL TYPES
// ═══════════════════════════════════════════════════════════════

export interface HistoricalSnapshot {
  timestamp: string;
  entity_type: string;
  entity_id: string;
  state: Record<string, unknown>;
  believed_at: string; // What the system believed at that time
}

export interface TimelineEvent {
  id: string;
  type: 'task' | 'decision' | 'intent' | 'automation' | 'note' | 'override';
  title: string;
  description?: string;
  timestamp: string;
  agency: AgentType;
  entity_id: string;
}

// ═══════════════════════════════════════════════════════════════
// 🛡️ TRUST & TRANSPARENCY TYPES
// ═══════════════════════════════════════════════════════════════

export interface TrustPolicy {
  id: string;
  category: 'tracking' | 'visibility' | 'usage' | 'retention';
  title: string;
  description: string;
  enabled: boolean;
  user_controllable: boolean;
}

export interface DataVisibility {
  data_type: string;
  visible_to: ('self' | 'team' | 'managers' | 'admins' | 'org')[];
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// 📋 WORKFLOW TEMPLATES TYPES
// ═══════════════════════════════════════════════════════════════

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sprint' | 'decision' | 'knowledge' | 'review' | 'custom';
  steps: WorkflowStep[];
  recommended_for: string[];
  popularity_score: number;
}

export interface WorkflowStep {
  id: string;
  order: number;
  action_type: string;
  action_params: Record<string, unknown>;
  wait_for?: string;
  human_required: boolean;
}

export interface GovernancePreset {
  id: string;
  name: 'startup' | 'enterprise' | 'hybrid' | 'custom';
  description: string;
  policies: {
    decision_approval_required: boolean;
    automation_approval_required: boolean;
    ai_execution_allowed: boolean;
    audit_logging: boolean;
    data_retention_days: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// 🟢 SYSTEM STATUS TYPES
// ═══════════════════════════════════════════════════════════════

export type SystemStatus = 'healthy' | 'attention_needed' | 'issues_detected';

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  status: 'ok' | 'warning' | 'error';
  details?: string;
  action_url?: string;
  checked_at: string;
}

export interface SystemHealth {
  overall_status: SystemStatus;
  checks: HealthCheck[];
  attention_count: number;
  last_checked: string;
}

