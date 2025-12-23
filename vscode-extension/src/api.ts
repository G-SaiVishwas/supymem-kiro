import axios, { AxiosInstance } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface IntentData {
    file_path: string;
    purpose: string;
    context: string;
    constraints: Constraint[];
    open_questions: string[];
    recent_changes: RecentChange[];
    experts: Expert[];
    related_decisions: DecisionSummary[];
}

export interface Constraint {
    id: string;
    type: string;  // performance, security, cost, reliability
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    threshold?: Record<string, any>;
    approved_by?: string;
    approved_at?: string;
}

export interface RecentChange {
    date: string;
    description: string;
    author: string;
    decision_id?: string;
}

export interface Expert {
    username: string;
    ownership_score: number;
    last_active?: string;
}

export interface DecisionSummary {
    id: string;
    title: string;
    summary?: string;
    category?: string;
    importance?: string;
    decided_by?: string;
    created_at: string;
    source_url?: string;
}

export interface DecisionDetail extends DecisionSummary {
    reasoning?: string;
    alternatives_considered?: Alternative[];
    affected_files: string[];
    affected_components?: string[];
    context?: string;
    content?: string;  // Detailed content/description
    impact?: string;
    participants?: string[];
    status?: 'active' | 'superseded' | 'deprecated';
    constraints?: Constraint[];
    knowledge_sources?: KnowledgeSource[];
}

export interface Alternative {
    option: string;
    pros?: string[];
    cons?: string[];
    rejected_reason?: string;
}

export interface ChangeAnalysis {
    has_conflicts: boolean;
    conflicts: ConflictItem[];
    affected_decisions: DecisionSummary[];
    affected_users: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    recommendations: string[];
}

export interface ConflictItem {
    decision_id: string;
    decision_title: string;
    conflict_type: string;
    description: string;
    severity: 'warning' | 'error' | 'info';
    approved_by?: string;
    approved_at?: string;
}

export interface AgentStatus {
    id: string;
    name: string;
    status: 'idle' | 'executing' | 'waiting_approval' | 'error';
    current_task?: string;
    pending_approvals: number;
    last_active: string;
    execution_history: AgentExecution[];
}

export interface AgentExecution {
    id: string;
    task: string;
    status: 'success' | 'failed' | 'cancelled';
    started_at: string;
    completed_at?: string;
}

export interface ChallengeResult {
    challenge_id?: string;
    decision_id?: string;
    challenge_question?: string;
    decision_found?: boolean;
    decision?: DecisionDetail;
    original_reasoning?: string;
    related_discussions?: RelatedDiscussion[];
    related_decisions?: DecisionSummary[];
    ai_analysis?: string;
    analysis?: {
        validity: 'valid' | 'partially_valid' | 'invalid';
        reasoning: string;
        affected_areas: string[];
        confidence_score: number;
    };
    alternatives_considered?: Alternative[];
    suggested_alternatives?: string[];
    suggested_actions?: string[];
    confidence?: number;
    knowledge_sources?: KnowledgeSource[];
}

export interface RelatedDiscussion {
    id?: string;
    content: string;
    source?: string;
    score?: number;
}

export interface TaskItem {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    team_id?: string;
    assigned_to?: string;
    due_date?: string;
    created_at: string;
    related_decision_id?: string;
}

export interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description?: string;
    user: string;
    timestamp: string;
    source_url?: string;
    related_file?: string;
    metadata?: Record<string, any>;
}

export interface WhyExistsResult {
    file_path: string;
    purpose: string;
    created_by?: string;
    created_at?: string;
    related_decisions: DecisionSummary[];
    dependencies: string[];
    dependents: string[];
    knowledge_sources: RelatedDiscussion[];
}

export interface WhatBreaksResult {
    file_path: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    dependents: DependentInfo[];
    affected_tests: string[];
    affected_decisions: DecisionSummary[];
    impact_summary: string;
    recommendations: string[];
}

export interface DependentInfo {
    file: string;
    usage_type: string;
    importance: string;
}

export interface KnowledgeSource {
    content: string;
    source: string;
    score?: number;
}

export interface KnowledgeEntry {
    id: string;
    content: string;
    source: string;
    source_id?: string;
    source_url?: string;
    team_id: string;
    user_id?: string;
    category: string;
    subcategory?: string;
    importance_score?: number;
    is_actionable?: boolean;
    tags: string[];
    metadata?: Record<string, any>;
    created_at: string;
    updated_at?: string;
}

export interface KnowledgeEntryCreate {
    content: string;
    source: string;
    team_id?: string;
    user_id?: string;
    category?: string;
    source_url?: string;
    metadata?: Record<string, any>;
    tags?: string[];
}

export interface KnowledgeEntryUpdate {
    content?: string;
    category?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface ConstraintScope {
    files: string[];
    components: string[];
}

export interface ConstraintFull {
    id: string;
    team_id: string;
    type: string;
    name: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    scope: ConstraintScope;
    threshold: Record<string, any>;
    enforcement: 'hard' | 'soft';
    approved_by?: string;
    approved_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ConstraintCreate {
    team_id?: string;
    type: string;
    name: string;
    description: string;
    severity?: string;
    scope: ConstraintScope;
    threshold?: Record<string, any>;
    enforcement?: string;
    approved_by?: string;
}

export interface ConstraintCheck {
    file_path: string;
    has_violations: boolean;
    has_warnings: boolean;
    violations: ConstraintViolation[];
    warnings: ConstraintViolation[];
    can_proceed: boolean;
}

export interface ConstraintViolation {
    constraint_id: string;
    name: string;
    description: string;
    severity: string;
    type: string;
    enforcement: string;
    approved_by?: string;
}

export interface KnowledgeStats {
    total: number;
    by_category: Record<string, number>;
    by_source: Record<string, number>;
}

// ============================================================================
// API CLIENT
// ============================================================================

export class SupymemAPI {
    private client: AxiosInstance;
    private teamId: string;
    private username: string;

    constructor(baseUrl: string, teamId: string, username: string) {
        this.client = axios.create({
            baseURL: `${baseUrl}/api/v1`,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        this.teamId = teamId;
        this.username = username;
    }

    // ========================================================================
    // HEALTH & CONNECTION
    // ========================================================================

    async healthCheck(): Promise<boolean> {
        const baseUrl = this.client.defaults.baseURL?.replace('/api/v1', '') || '';
        const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
        return response.status === 200;
    }

    // ========================================================================
    // INTENT & CONTEXT
    // ========================================================================

    async getFileIntent(filePath: string): Promise<IntentData> {
        try {
            const { data } = await this.client.post('/intent/analyze', {
                file_path: filePath,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            // Return mock data for demo if endpoint doesn't exist yet
            return this.getMockIntentData(filePath);
        }
    }

    async getActiveConstraints(scope?: string): Promise<Constraint[]> {
        try {
            const { data } = await this.client.get('/constraints/active', {
                params: { team_id: this.teamId, scope }
            });
            return data;
        } catch (error) {
            return this.getMockConstraints();
        }
    }

    // ========================================================================
    // CHANGE ANALYSIS
    // ========================================================================

    async analyzeChange(files: string[], diff?: string): Promise<ChangeAnalysis> {
        try {
            const { data } = await this.client.post('/changes/analyze', {
                files,
                diff,
                team_id: this.teamId,
                user_id: this.username
            });
            return data;
        } catch (error) {
            return this.getMockChangeAnalysis(files);
        }
    }

    async simulateChange(files: string[], proposedChanges: string): Promise<ChangeAnalysis> {
        try {
            const { data } = await this.client.post('/changes/simulate', {
                files,
                proposed_changes: proposedChanges,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            return this.getMockChangeAnalysis(files);
        }
    }

    // ========================================================================
    // WHY EXISTS / WHAT BREAKS
    // ========================================================================

    async whyExists(filePath: string, selection?: string): Promise<WhyExistsResult> {
        try {
            const { data } = await this.client.post('/intent/why-exists', {
                file_path: filePath,
                selection,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            return this.getMockWhyExists(filePath);
        }
    }

    async whatBreaks(filePath: string): Promise<WhatBreaksResult> {
        try {
            const { data } = await this.client.post('/intent/what-breaks', {
                file_path: filePath,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            return this.getMockWhatBreaks(filePath);
        }
    }

    // ========================================================================
    // DECISIONS
    // ========================================================================

    async getDecisions(category?: string, filePath?: string): Promise<DecisionSummary[]> {
        try {
            const { data } = await this.client.get('/decisions', {
                params: { team_id: this.teamId, category, file_path: filePath }
            });
            return data;
        } catch (error) {
            return this.getMockDecisions();
        }
    }

    async getDecision(decisionId: string): Promise<DecisionDetail> {
        try {
            const { data } = await this.client.get(`/decisions/${decisionId}`);
            return data;
        } catch (error) {
            return this.getMockDecisionDetail(decisionId);
        }
    }

    async challengeDecision(question: string, decisionId?: string): Promise<ChallengeResult> {
        try {
            const { data } = await this.client.post('/challenge', {
                question,
                team_id: this.teamId,
                challenger_id: this.username,
                decision_id: decisionId
            });
            return data;
        } catch (error) {
            return this.getMockChallengeResult(question, decisionId);
        }
    }

    async getDecisionTrace(filePath: string): Promise<DecisionDetail[]> {
        try {
            const { data } = await this.client.get('/decisions/trace', {
                params: { team_id: this.teamId, file_path: filePath }
            });
            return data;
        } catch (error) {
            return this.getMockDecisionTrace(filePath);
        }
    }

    // ========================================================================
    // TASKS
    // ========================================================================

    async getTasks(): Promise<TaskItem[]> {
        try {
            const { data } = await this.client.get('/tasks', {
                params: {
                    team_id: this.teamId,
                    assigned_to: this.username
                }
            });
            return data;
        } catch (error) {
            return this.getMockTasks();
        }
    }

    async updateTask(taskId: string, updates: Partial<TaskItem>): Promise<void> {
        try {
            await this.client.patch(`/tasks/${taskId}`, updates);
        } catch (error) {
            // Silently succeed for demo
            console.log('Task updated (mock):', taskId, updates);
        }
    }

    // ========================================================================
    // ACTIVITIES
    // ========================================================================

    async getActivities(): Promise<ActivityItem[]> {
        try {
            const { data } = await this.client.get('/activities/team', {
                params: {
                    team_id: this.teamId,
                    limit: 20
                }
            });
            return data;
        } catch (error) {
            return this.getMockActivities();
        }
    }

    // ========================================================================
    // KNOWLEDGE QUERIES
    // ========================================================================

    async queryKnowledge(query: string): Promise<{ response: string; sources: any[] | null }> {
        try {
            const { data } = await this.client.post('/query', {
                query,
                team_id: this.teamId,
                user_id: this.username
            });
            return data;
        } catch (error) {
            return this.getMockQueryResponse(query);
        }
    }

    async storeKnowledge(content: string, source: string): Promise<void> {
        try {
            await this.client.post('/store', {
                content,
                source,
                team_id: this.teamId
            });
        } catch (error) {
            console.log('Knowledge stored (mock):', content.slice(0, 50));
        }
    }

    async searchKnowledge(query: string): Promise<{ results: any[] }> {
        try {
            const { data } = await this.client.post('/search', {
                query,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            return { results: [] };
        }
    }

    // ========================================================================
    // AGENTS
    // ========================================================================

    async getAgentStatus(): Promise<AgentStatus[]> {
        try {
            const { data } = await this.client.get('/agents/status', {
                params: { team_id: this.teamId }
            });
            return data;
        } catch (error) {
            return this.getMockAgentStatus();
        }
    }

    async approveAgentAction(agentId: string, actionId: string): Promise<void> {
        await this.client.post(`/agents/${agentId}/approve/${actionId}`);
    }

    async rejectAgentAction(agentId: string, actionId: string, reason: string): Promise<void> {
        await this.client.post(`/agents/${agentId}/reject/${actionId}`, { reason });
    }

    // ========================================================================
    // KNOWLEDGE ENTRIES CRUD
    // ========================================================================

    async listKnowledgeEntries(
        category?: string,
        source?: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ entries: KnowledgeEntry[]; count: number }> {
        try {
            const { data } = await this.client.get('/knowledge/entries', {
                params: {
                    team_id: this.teamId,
                    category,
                    source,
                    limit,
                    offset
                }
            });
            return data;
        } catch (error) {
            return this.getMockKnowledgeEntries();
        }
    }

    async getKnowledgeEntry(entryId: string): Promise<KnowledgeEntry | null> {
        try {
            const { data } = await this.client.get(`/knowledge/entries/${entryId}`);
            return data;
        } catch (error) {
            return null;
        }
    }

    async createKnowledgeEntry(entry: KnowledgeEntryCreate): Promise<KnowledgeEntry> {
        try {
            const { data } = await this.client.post('/knowledge/entries', {
                ...entry,
                team_id: entry.team_id || this.teamId
            });
            return data;
        } catch (error) {
            // Return mock created entry
            return {
                id: `ke-${Date.now()}`,
                content: entry.content,
                source: entry.source,
                team_id: this.teamId,
                category: entry.category || 'other',
                tags: entry.tags || [],
                created_at: new Date().toISOString()
            };
        }
    }

    async updateKnowledgeEntry(entryId: string, updates: KnowledgeEntryUpdate): Promise<KnowledgeEntry | null> {
        try {
            const { data } = await this.client.put(`/knowledge/entries/${entryId}`, updates);
            return data;
        } catch (error) {
            console.log('Knowledge entry updated (mock):', entryId);
            return null;
        }
    }

    async deleteKnowledgeEntry(entryId: string): Promise<boolean> {
        try {
            await this.client.delete(`/knowledge/entries/${entryId}`);
            return true;
        } catch (error) {
            console.log('Knowledge entry deleted (mock):', entryId);
            return true;
        }
    }

    async getKnowledgeStats(): Promise<KnowledgeStats> {
        try {
            const { data } = await this.client.get('/knowledge/stats', {
                params: { team_id: this.teamId }
            });
            return data;
        } catch (error) {
            return {
                total: 42,
                by_category: {
                    'decision': 15,
                    'architecture': 8,
                    'process': 7,
                    'task': 12
                },
                by_source: {
                    'slack': 18,
                    'github': 12,
                    'manual': 8,
                    'api': 4
                }
            };
        }
    }

    // ========================================================================
    // DECISIONS CRUD
    // ========================================================================

    async createDecision(decision: {
        title: string;
        summary?: string;
        reasoning?: string;
        context?: string;
        impact?: string;
        decided_by?: string;
        participants?: string[];
        affected_files?: string[];
        affected_components?: string[];
        category?: string;
        importance?: string;
        source_type?: string;
        source_url?: string;
        alternatives_considered?: any[];
        tags?: string[];
    }): Promise<DecisionDetail> {
        try {
            const { data } = await this.client.post('/decisions', {
                ...decision,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            // Return mock created decision
            return {
                id: `dec-${Date.now()}`,
                title: decision.title,
                summary: decision.summary,
                affected_files: decision.affected_files || [],
                created_at: new Date().toISOString()
            };
        }
    }

    async updateDecision(decisionId: string, updates: {
        title?: string;
        summary?: string;
        reasoning?: string;
        context?: string;
        impact?: string;
        status?: string;
        importance?: string;
        affected_files?: string[];
        tags?: string[];
    }): Promise<DecisionDetail | null> {
        try {
            const { data } = await this.client.put(`/decisions/${decisionId}`, updates);
            return data;
        } catch (error) {
            console.log('Decision updated (mock):', decisionId);
            return null;
        }
    }

    async deleteDecision(decisionId: string): Promise<boolean> {
        try {
            await this.client.delete(`/decisions/${decisionId}`);
            return true;
        } catch (error) {
            console.log('Decision deleted (mock):', decisionId);
            return true;
        }
    }

    async getDecisionsForFile(filePath: string): Promise<{ decisions: DecisionDetail[]; count: number }> {
        try {
            const { data } = await this.client.get(`/decisions/file/${encodeURIComponent(filePath)}`, {
                params: { team_id: this.teamId }
            });
            return data;
        } catch (error) {
            return { decisions: [], count: 0 };
        }
    }

    // ========================================================================
    // CONSTRAINTS CRUD
    // ========================================================================

    async listConstraints(
        type?: string,
        severity?: string,
        isActive: boolean = true
    ): Promise<{ constraints: ConstraintFull[]; count: number }> {
        try {
            const { data } = await this.client.get('/constraints', {
                params: {
                    team_id: this.teamId,
                    type,
                    severity,
                    is_active: isActive
                }
            });
            return data;
        } catch (error) {
            return this.getMockConstraintsList();
        }
    }

    async getConstraint(constraintId: string): Promise<ConstraintFull | null> {
        try {
            const { data } = await this.client.get(`/constraints/${constraintId}`);
            return data;
        } catch (error) {
            return null;
        }
    }

    async createConstraint(constraint: ConstraintCreate): Promise<ConstraintFull> {
        try {
            const { data } = await this.client.post('/constraints', {
                ...constraint,
                team_id: constraint.team_id || this.teamId
            });
            return data;
        } catch (error) {
            // Return mock created constraint
            return {
                id: `con-${Date.now()}`,
                team_id: this.teamId,
                type: constraint.type,
                name: constraint.name,
                description: constraint.description,
                severity: (constraint.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
                scope: constraint.scope,
                threshold: constraint.threshold || {},
                enforcement: (constraint.enforcement || 'soft') as 'hard' | 'soft',
                is_active: true,
                created_at: new Date().toISOString()
            };
        }
    }

    async updateConstraint(constraintId: string, updates: {
        name?: string;
        description?: string;
        severity?: string;
        scope?: ConstraintScope;
        threshold?: Record<string, any>;
        enforcement?: string;
        is_active?: boolean;
    }): Promise<ConstraintFull | null> {
        try {
            const { data } = await this.client.put(`/constraints/${constraintId}`, updates);
            return data;
        } catch (error) {
            console.log('Constraint updated (mock):', constraintId);
            return null;
        }
    }

    async deleteConstraint(constraintId: string): Promise<boolean> {
        try {
            await this.client.delete(`/constraints/${constraintId}`);
            return true;
        } catch (error) {
            console.log('Constraint deleted (mock):', constraintId);
            return true;
        }
    }

    async checkConstraints(filePath: string, proposedChanges?: string): Promise<ConstraintCheck> {
        try {
            const { data } = await this.client.post('/constraints/check', {
                file_path: filePath,
                proposed_changes: proposedChanges,
                team_id: this.teamId
            });
            return data;
        } catch (error) {
            return this.getMockConstraintCheck(filePath);
        }
    }

    async getConstraintsForFile(filePath: string): Promise<{ constraints: ConstraintFull[]; count: number }> {
        try {
            const { data } = await this.client.get(`/constraints/file/${encodeURIComponent(filePath)}`, {
                params: { team_id: this.teamId }
            });
            return data;
        } catch (error) {
            return this.getMockConstraintsList();
        }
    }

    // ========================================================================
    // MOCK DATA FOR DEMO
    // ========================================================================

    private getMockIntentData(filePath: string): IntentData {
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
        const isAuthFile = filePath.toLowerCase().includes('auth');
        const isApiFile = filePath.toLowerCase().includes('api');
        
        return {
            file_path: filePath,
            purpose: isAuthFile 
                ? 'JWT-based authentication with refresh token rotation and session management'
                : isApiFile 
                    ? 'RESTful API endpoints for client-server communication'
                    : `Core functionality for ${fileName.replace(/\.[^/.]+$/, '')}`,
            context: 'Part of the main application infrastructure. Critical path for user operations.',
            constraints: this.getMockConstraints(),
            open_questions: [
                'SSO integration timeline pending',
                'Rate limiting strategy under discussion',
                'Consider caching strategy for hot paths'
            ],
            recent_changes: [
                { date: '2024-12-20', description: 'Added refresh token rotation', author: 'rahul' },
                { date: '2024-12-15', description: 'Switched to RS256 algorithm', author: 'sarah' },
                { date: '2024-12-10', description: 'Initial implementation', author: 'john' }
            ],
            experts: [
                { username: 'rahul', ownership_score: 0.45, last_active: '2024-12-20' },
                { username: 'sarah', ownership_score: 0.30, last_active: '2024-12-18' },
                { username: 'john', ownership_score: 0.25, last_active: '2024-12-10' }
            ],
            related_decisions: [
                {
                    id: 'dec-001',
                    title: 'JWT over Session-based Auth',
                    summary: 'Chose JWT for stateless authentication to support microservices',
                    category: 'architecture',
                    importance: 'high',
                    decided_by: 'john',
                    created_at: '2024-10-15'
                },
                {
                    id: 'dec-002',
                    title: 'Redis for Token Store',
                    summary: 'Using Redis for token blacklisting and session storage',
                    category: 'technology',
                    importance: 'medium',
                    decided_by: 'sarah',
                    created_at: '2024-11-01'
                }
            ]
        };
    }

    private getMockConstraints(): Constraint[] {
        return [
            {
                id: 'con-001',
                type: 'security',
                description: 'Token expiry must be < 1 hour',
                severity: 'critical',
                threshold: { max_expiry_seconds: 3600 },
                approved_by: 'security-team',
                approved_at: '2024-09-01'
            },
            {
                id: 'con-002',
                type: 'performance',
                description: 'Auth endpoints must respond in < 50ms',
                severity: 'high',
                threshold: { max_latency_ms: 50 },
                approved_by: 'john',
                approved_at: '2024-10-15'
            },
            {
                id: 'con-003',
                type: 'cost',
                description: 'Prefer local validation over external API calls',
                severity: 'medium',
                approved_by: 'finance-team',
                approved_at: '2024-08-20'
            }
        ];
    }

    private getMockChangeAnalysis(files: string[]): ChangeAnalysis {
        const hasAuthFile = files.some(f => f.toLowerCase().includes('auth'));
        
        return {
            has_conflicts: hasAuthFile,
            conflicts: hasAuthFile ? [
                {
                    decision_id: 'dec-001',
                    decision_title: 'Low-latency over cost',
                    conflict_type: 'performance_constraint',
                    description: 'This change adds an external API call which may increase latency beyond the 50ms threshold',
                    severity: 'warning',
                    approved_by: 'john',
                    approved_at: '2024-10-15'
                }
            ] : [],
            affected_decisions: [
                {
                    id: 'dec-001',
                    title: 'JWT over Session-based Auth',
                    category: 'architecture',
                    importance: 'high',
                    created_at: '2024-10-15'
                }
            ],
            affected_users: ['rahul', 'sarah'],
            risk_level: hasAuthFile ? 'medium' : 'low',
            summary: hasAuthFile 
                ? 'Changes to authentication logic detected. Review required.'
                : 'Standard code changes. No major conflicts detected.',
            recommendations: hasAuthFile ? [
                'Consider local caching to maintain latency requirements',
                'Add performance tests for the new code path',
                'Notify security team of auth changes'
            ] : ['Proceed with standard code review']
        };
    }

    private getMockWhyExists(filePath: string): WhyExistsResult {
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
        
        return {
            file_path: filePath,
            purpose: `This file provides core functionality for the ${fileName.replace(/\.[^/.]+$/, '')} module. It was created to encapsulate related logic and maintain separation of concerns.`,
            created_by: 'john',
            created_at: '2024-06-15',
            related_decisions: [
                {
                    id: 'dec-003',
                    title: 'Modular Architecture',
                    summary: 'Code organized by feature/domain for better maintainability',
                    category: 'architecture',
                    importance: 'high',
                    created_at: '2024-05-01'
                }
            ],
            dependencies: [
                'src/utils/helpers.ts',
                'src/config/settings.ts',
                'src/database/connection.ts'
            ],
            dependents: [
                'src/api/routes/main.ts',
                'src/services/core.ts'
            ],
            knowledge_sources: [
                {
                    content: 'Created during the initial architecture setup to handle...',
                    source: 'PR #42',
                    score: 0.92
                }
            ]
        };
    }

    private getMockWhatBreaks(filePath: string): WhatBreaksResult {
        return {
            file_path: filePath,
            risk_level: 'medium',
            dependents: [
                { file: 'src/api/routes/main.ts', usage_type: 'import', importance: 'high' },
                { file: 'src/services/core.ts', usage_type: 'import', importance: 'high' },
                { file: 'tests/unit/test_module.ts', usage_type: 'test', importance: 'medium' }
            ],
            affected_tests: [
                'tests/unit/test_module.ts',
                'tests/integration/test_api.ts'
            ],
            affected_decisions: [
                {
                    id: 'dec-003',
                    title: 'Modular Architecture',
                    category: 'architecture',
                    importance: 'high',
                    created_at: '2024-05-01'
                }
            ],
            impact_summary: 'Removing this file would break 2 direct dependents and 2 test files. Consider extracting reusable parts before removal.',
            recommendations: [
                'Create migration plan before removal',
                'Update dependent modules first',
                'Run full test suite after changes',
                'Notify team members working on dependent files'
            ]
        };
    }

    private getMockAgentStatus(): AgentStatus[] {
        return [
            {
                id: 'agent-001',
                name: 'Code Review Agent',
                status: 'idle',
                pending_approvals: 0,
                last_active: new Date().toISOString(),
                execution_history: [
                    {
                        id: 'exec-001',
                        task: 'Review PR #156',
                        status: 'success',
                        started_at: new Date(Date.now() - 3600000).toISOString(),
                        completed_at: new Date(Date.now() - 3500000).toISOString()
                    }
                ]
            },
            {
                id: 'agent-002',
                name: 'Test Generator',
                status: 'executing',
                current_task: 'Generating tests for auth module',
                pending_approvals: 0,
                last_active: new Date().toISOString(),
                execution_history: []
            },
            {
                id: 'agent-003',
                name: 'Documentation Agent',
                status: 'waiting_approval',
                current_task: 'Update API docs for /users endpoint',
                pending_approvals: 1,
                last_active: new Date().toISOString(),
                execution_history: []
            },
            {
                id: 'agent-004',
                name: 'Security Scanner',
                status: 'idle',
                pending_approvals: 0,
                last_active: new Date(Date.now() - 7200000).toISOString(),
                execution_history: [
                    {
                        id: 'exec-003',
                        task: 'Scan dependencies for vulnerabilities',
                        status: 'success',
                        started_at: new Date(Date.now() - 7200000).toISOString(),
                        completed_at: new Date(Date.now() - 7100000).toISOString()
                    }
                ]
            },
            {
                id: 'agent-005',
                name: 'Refactoring Agent',
                status: 'waiting_approval',
                current_task: 'Refactor PaymentService for better testability',
                pending_approvals: 2,
                last_active: new Date(Date.now() - 300000).toISOString(),
                execution_history: []
            }
        ];
    }

    private getMockDecisions(): DecisionSummary[] {
        return [
            {
                id: 'dec-001',
                title: 'JWT over Session-based Auth',
                summary: 'Chose JWT for stateless authentication to support microservices architecture',
                category: 'architecture',
                importance: 'critical',
                decided_by: 'john',
                created_at: '2024-10-15',
                source_url: 'https://github.com/team/repo/discussions/42'
            },
            {
                id: 'dec-002',
                title: 'Redis for Token Store',
                summary: 'Using Redis for token blacklisting and session storage for O(1) lookups',
                category: 'technology',
                importance: 'high',
                decided_by: 'sarah',
                created_at: '2024-11-01',
                source_url: 'https://github.com/team/repo/discussions/58'
            },
            {
                id: 'dec-003',
                title: 'PostgreSQL as Primary Database',
                summary: 'Selected PostgreSQL for ACID compliance and JSON support over MongoDB',
                category: 'technology',
                importance: 'critical',
                decided_by: 'john',
                created_at: '2024-09-20'
            },
            {
                id: 'dec-004',
                title: 'Rate Limiting Strategy',
                summary: 'Token bucket algorithm with 100 req/min per user, sliding window for burst',
                category: 'performance',
                importance: 'high',
                decided_by: 'rahul',
                created_at: '2024-11-15'
            },
            {
                id: 'dec-005',
                title: 'Predictability over Speed',
                summary: 'System should prioritize consistent response times over raw throughput',
                category: 'architecture',
                importance: 'critical',
                decided_by: 'cto',
                created_at: '2024-08-01'
            },
            {
                id: 'dec-006',
                title: 'Feature Flags for Rollouts',
                summary: 'All new features must be behind feature flags for gradual rollout',
                category: 'process',
                importance: 'high',
                decided_by: 'pm-lead',
                created_at: '2024-09-10'
            },
            {
                id: 'dec-007',
                title: 'GraphQL for Client API',
                summary: 'Using GraphQL for client-facing API, REST for internal services',
                category: 'technology',
                importance: 'high',
                decided_by: 'frontend-lead',
                created_at: '2024-10-01'
            }
        ];
    }

    private getMockDecisionDetail(decisionId: string): DecisionDetail {
        const decisions = this.getMockDecisions();
        const summary = decisions.find(d => d.id === decisionId) || decisions[0];
        
        return {
            ...summary,
            id: summary.id,
            title: summary.title,
            created_at: summary.created_at,
            content: `# ${summary.title}\n\n## Context\n${summary.summary}\n\n## Options Considered\n1. Option A - Current choice\n2. Option B - Rejected due to scalability concerns\n3. Option C - Too complex for current team size\n\n## Decision\nWe chose Option A because it best fits our constraints and long-term goals.\n\n## Consequences\n- Need to maintain Redis cluster\n- Team requires training on new patterns\n- Migration plan needed for legacy systems`,
            participants: [summary.decided_by || 'team', 'sarah', 'rahul'],
            affected_files: [
                'src/auth/jwt.ts',
                'src/config/redis.ts',
                'src/middleware/auth.ts'
            ],
            status: 'active' as const,
            constraints: [
                {
                    id: 'con-001',
                    type: 'security',
                    description: 'Token expiry must be < 1 hour',
                    severity: 'critical' as const,
                    approved_by: summary.decided_by
                }
            ],
            knowledge_sources: [
                {
                    content: 'Discussed in architecture review meeting...',
                    source: 'meeting-notes-2024-10',
                    score: 0.95
                }
            ]
        };
    }

    private getMockDecisionTrace(filePath: string): DecisionDetail[] {
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
        const isAuthFile = filePath.toLowerCase().includes('auth');
        const isPaymentFile = filePath.toLowerCase().includes('payment');
        
        const baseTrace: DecisionDetail[] = [
            {
                id: 'trace-goal',
                title: '🎯 Goal: Build Secure User Authentication',
                content: 'Primary objective: Implement authentication that scales to 1M+ users with sub-100ms response times.',
                category: 'goal',
                importance: 'critical',
                created_at: '2024-08-01',
                participants: ['cto', 'security-lead'],
                affected_files: [],
                status: 'active',
                constraints: []
            },
            {
                id: 'trace-constraint-1',
                title: '🔒 Constraint: Stateless Auth Required',
                content: 'Due to microservices architecture, authentication must be stateless to avoid single points of failure.',
                category: 'constraint',
                importance: 'critical',
                created_at: '2024-08-15',
                participants: ['architect'],
                affected_files: [],
                status: 'active',
                constraints: []
            },
            {
                id: 'trace-option-1',
                title: '⚖️ Option: JWT vs Session Cookies',
                content: 'Evaluated JWT tokens vs traditional session cookies. JWT chosen for statelessness and microservice compatibility.',
                category: 'evaluation',
                importance: 'high',
                created_at: '2024-09-01',
                participants: ['john', 'sarah'],
                affected_files: [],
                status: 'active',
                constraints: []
            },
            {
                id: 'trace-decision-1',
                title: '✅ Decision: RS256 JWT with Refresh Tokens',
                content: 'Final implementation uses RS256 algorithm with 15-minute access tokens and 7-day refresh tokens.',
                category: 'decision',
                importance: 'critical',
                created_at: '2024-09-15',
                participants: ['john', 'security-lead'],
                affected_files: ['src/auth/jwt.ts', 'src/auth/refresh.ts'],
                status: 'active',
                constraints: [
                    {
                        id: 'con-001',
                        type: 'security',
                        description: 'Access token expiry must be ≤ 15 minutes',
                        severity: 'critical'
                    }
                ]
            },
            {
                id: 'trace-outcome-1',
                title: '📊 Outcome: 99.9% Auth Uptime Achieved',
                content: 'System has maintained 99.9% uptime for auth services. Average response time: 23ms.',
                category: 'outcome',
                importance: 'high',
                created_at: '2024-12-01',
                participants: ['devops'],
                affected_files: [],
                status: 'active',
                constraints: []
            }
        ];

        if (isPaymentFile) {
            return [
                {
                    id: 'trace-goal-pay',
                    title: '🎯 Goal: PCI-DSS Compliant Payment Processing',
                    content: 'Build payment system that meets PCI-DSS Level 1 compliance requirements.',
                    category: 'goal',
                    importance: 'critical',
                    created_at: '2024-07-01',
                    participants: ['cfo', 'security-lead', 'compliance'],
                    affected_files: [],
                    status: 'active',
                    constraints: []
                },
                {
                    id: 'trace-constraint-pay',
                    title: '🔒 Constraint: CFO Approval Required for Changes',
                    content: 'Any changes to payment logic require CFO sign-off due to regulatory requirements.',
                    category: 'constraint',
                    importance: 'critical',
                    created_at: '2024-07-15',
                    participants: ['cfo'],
                    affected_files: ['src/payments/*'],
                    status: 'active',
                    constraints: [
                        {
                            id: 'con-pay-001',
                            type: 'regulatory',
                            description: 'CFO approval required for payment changes',
                            severity: 'critical'
                        }
                    ]
                },
                {
                    id: 'trace-decision-pay',
                    title: '✅ Decision: Stripe + Tokenization',
                    content: 'Using Stripe for payment processing with client-side tokenization to minimize PCI scope.',
                    category: 'decision',
                    importance: 'critical',
                    created_at: '2024-08-01',
                    participants: ['john', 'cfo', 'compliance'],
                    affected_files: ['src/payments/stripe.ts'],
                    status: 'active',
                    constraints: []
                }
            ];
        }

        if (isAuthFile) {
            return baseTrace;
        }

        // Generic trace for other files
        return [
            {
                id: 'trace-goal-gen',
                title: `🎯 Goal: Implement ${fileName.replace(/\.[^/.]+$/, '')} Module`,
                content: `Core module for handling ${fileName.replace(/\.[^/.]+$/, '')} functionality.`,
                category: 'goal',
                importance: 'medium',
                created_at: '2024-06-01',
                participants: ['team'],
                affected_files: [],
                status: 'active',
                constraints: []
            },
            {
                id: 'trace-decision-gen',
                title: '✅ Decision: Modular Architecture',
                content: 'Code organized by feature/domain following clean architecture principles.',
                category: 'decision',
                importance: 'high',
                created_at: '2024-06-15',
                participants: ['architect'],
                affected_files: [filePath],
                status: 'active',
                constraints: []
            }
        ];
    }

    private getMockTasks(): TaskItem[] {
        return [
            {
                id: 'task-001',
                title: 'Review auth token rotation implementation',
                description: 'Verify the new refresh token rotation logic meets security requirements',
                status: 'in_progress',
                priority: 'high',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                due_date: new Date(Date.now() + 86400000).toISOString(),
                related_decision_id: 'dec-001'
            },
            {
                id: 'task-002',
                title: 'Approve agent-generated test suite',
                description: 'Test Generator agent has created 47 new tests. Review and approve.',
                status: 'pending',
                priority: 'high',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 'task-003',
                title: 'Clarify rate limiting requirements',
                description: 'PM needs confirmation on burst limits for enterprise tier',
                status: 'pending',
                priority: 'medium',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 172800000).toISOString(),
                related_decision_id: 'dec-004'
            },
            {
                id: 'task-004',
                title: 'Sign off on payment module refactor',
                description: 'Refactoring Agent proposal ready for review - requires CFO approval',
                status: 'pending',
                priority: 'critical',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
                id: 'task-005',
                title: 'Update constraint: Redis timeout',
                description: 'Operations suggests increasing Redis timeout from 100ms to 200ms',
                status: 'pending',
                priority: 'low',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 259200000).toISOString()
            },
            {
                id: 'task-006',
                title: 'Document new API endpoints',
                description: 'Completed by Documentation Agent - verify accuracy',
                status: 'completed',
                priority: 'medium',
                assigned_to: this.username,
                created_at: new Date(Date.now() - 432000000).toISOString()
            }
        ];
    }

    private getMockActivities(): ActivityItem[] {
        const now = Date.now();
        return [
            {
                id: 'act-001',
                type: 'decision',
                title: 'Decision approved: Rate Limiting Strategy',
                description: 'rahul approved the token bucket algorithm implementation',
                user: 'rahul',
                timestamp: new Date(now - 1800000).toISOString(),
                related_file: 'src/middleware/rateLimit.ts',
                metadata: { decision_id: 'dec-004' }
            },
            {
                id: 'act-002',
                type: 'agent_action',
                title: 'Test Generator completed task',
                description: 'Generated 47 unit tests for auth module',
                user: 'system',
                timestamp: new Date(now - 3600000).toISOString(),
                metadata: { agent_id: 'agent-002', tests_count: 47 }
            },
            {
                id: 'act-003',
                type: 'constraint_violation',
                title: '⚠️ Constraint violation detected',
                description: 'Proposed change would exceed 100ms latency threshold',
                user: 'system',
                timestamp: new Date(now - 5400000).toISOString(),
                related_file: 'src/api/routes/users.ts',
                metadata: { constraint_id: 'con-002' }
            },
            {
                id: 'act-004',
                type: 'intent_change',
                title: 'Intent updated for PaymentService',
                description: 'Added PCI-DSS compliance requirement',
                user: 'sarah',
                timestamp: new Date(now - 7200000).toISOString(),
                related_file: 'src/payments/stripe.ts'
            },
            {
                id: 'act-005',
                type: 'decision',
                title: 'New decision recorded',
                description: 'Chose GraphQL for client-facing API',
                user: 'frontend-lead',
                timestamp: new Date(now - 14400000).toISOString(),
                metadata: { decision_id: 'dec-007' }
            },
            {
                id: 'act-006',
                type: 'agent_action',
                title: 'Security Scanner found no issues',
                description: 'Weekly dependency scan completed successfully',
                user: 'system',
                timestamp: new Date(now - 18000000).toISOString(),
                metadata: { agent_id: 'agent-004' }
            },
            {
                id: 'act-007',
                type: 'knowledge',
                title: 'Knowledge stored from Slack',
                description: 'Architecture discussion about caching strategy',
                user: 'john',
                timestamp: new Date(now - 21600000).toISOString(),
                metadata: { source: 'slack-#architecture' }
            },
            {
                id: 'act-008',
                type: 'approval',
                title: 'CFO approved payment changes',
                description: 'Quarterly payment module update approved',
                user: 'cfo',
                timestamp: new Date(now - 86400000).toISOString(),
                related_file: 'src/payments/*'
            }
        ];
    }

    private getMockChallengeResult(question: string, decisionId?: string): ChallengeResult {
        return {
            decision_id: decisionId || 'dec-general',
            challenge_question: question,
            analysis: {
                validity: 'partially_valid',
                reasoning: `Your question raises a valid concern. Based on our knowledge base:\n\n1. **Current Decision Context**: The existing decision was made considering trade-offs between performance and maintainability.\n\n2. **Your Challenge**: "${question}" - This touches on aspects that were partially discussed but may warrant revisiting.\n\n3. **Relevant Constraints**: There are active constraints that limit our options here, particularly around latency (< 100ms) and security requirements.\n\n4. **Recommendation**: Consider scheduling a review meeting to discuss this with the relevant stakeholders.`,
                affected_areas: ['architecture', 'performance'],
                confidence_score: 0.75
            },
            related_decisions: this.getMockDecisions().slice(0, 3),
            suggested_actions: [
                'Schedule architecture review meeting',
                'Create RFC document for proposed changes',
                'Run impact analysis on affected systems',
                'Consult with security team'
            ],
            knowledge_sources: [
                {
                    content: 'Previous discussion about similar concerns...',
                    source: 'architecture-review-2024-10',
                    score: 0.88
                },
                {
                    content: 'Trade-off analysis from initial design...',
                    source: 'design-doc-v2',
                    score: 0.82
                }
            ]
        };
    }

    private getMockQueryResponse(query: string): { response: string; sources: any[] | null } {
        const responses: Record<string, string> = {
            'auth': `**Authentication System Overview**\n\nOur authentication system uses **JWT tokens** with the following configuration:\n\n- **Algorithm**: RS256 (asymmetric)\n- **Access Token TTL**: 15 minutes\n- **Refresh Token TTL**: 7 days\n- **Token Storage**: Redis for blacklisting\n\n**Key Decisions**:\n1. Stateless auth chosen for microservices compatibility\n2. Refresh token rotation implemented for security\n3. Token blacklisting for logout functionality\n\n**Constraints**:\n- Token expiry must be < 1 hour (security requirement)\n- Response time must be < 100ms (performance SLA)`,
            
            'payment': `**Payment System Overview**\n\nWe use **Stripe** for payment processing with the following setup:\n\n- **Tokenization**: Client-side only (PCI-DSS compliance)\n- **Approval Required**: CFO sign-off for any changes\n- **Audit**: All transactions logged immutably\n\n**Regulatory Constraints**:\n- PCI-DSS Level 1 compliance required\n- No card data stored on our servers\n- Quarterly security audits mandatory`,
            
            'rate': `**Rate Limiting Strategy**\n\n**Algorithm**: Token Bucket with sliding window for burst\n\n**Tiers**:\n- Free: 100 req/min\n- Pro: 1000 req/min  \n- Enterprise: Custom limits\n\n**Implementation**:\n- Redis-based for distributed rate limiting\n- Headers include remaining quota\n- 429 response with retry-after header`,

            'default': `Based on our knowledge base, here's what I found:\n\n**Project Overview**\nThis is a production system with several critical constraints:\n\n1. **Performance**: Response times must be < 100ms\n2. **Security**: All auth changes require security review\n3. **Reliability**: 99.9% uptime SLA\n\n**Active Agents**:\n- Code Review Agent (monitoring PRs)\n- Test Generator (creating test coverage)\n- Documentation Agent (keeping docs updated)\n\nFor more specific information, try asking about: authentication, payments, rate limiting, or specific decisions.`
        };

        const lowerQuery = query.toLowerCase();
        let response = responses['default'];
        
        for (const [key, value] of Object.entries(responses)) {
            if (lowerQuery.includes(key)) {
                response = value;
                break;
            }
        }

        return {
            response,
            sources: [
                { content: 'Architecture documentation', source: 'docs/architecture.md', score: 0.92 },
                { content: 'Decision records', source: 'decisions/', score: 0.88 },
                { content: 'Team discussions', source: 'slack-archive', score: 0.75 }
            ]
        };
    }

    private getMockKnowledgeEntries(): { entries: KnowledgeEntry[]; count: number } {
        return {
            entries: [
                {
                    id: 'ke-001',
                    content: 'Authentication uses JWT tokens with RS256 algorithm. Access tokens expire in 15 minutes, refresh tokens in 7 days.',
                    source: 'slack',
                    team_id: this.teamId,
                    user_id: 'john',
                    category: 'architecture',
                    tags: ['auth', 'jwt', 'security'],
                    created_at: '2024-10-15T10:00:00Z'
                },
                {
                    id: 'ke-002',
                    content: 'Rate limiting uses token bucket algorithm with 100 req/min for free tier, 1000 for pro.',
                    source: 'github',
                    team_id: this.teamId,
                    user_id: 'sarah',
                    category: 'decision',
                    tags: ['rate-limiting', 'performance'],
                    created_at: '2024-11-01T14:30:00Z'
                },
                {
                    id: 'ke-003',
                    content: 'Payment processing must use Stripe with client-side tokenization only. CFO approval required for any changes.',
                    source: 'manual',
                    team_id: this.teamId,
                    user_id: 'cfo',
                    category: 'regulatory',
                    tags: ['payments', 'pci-dss', 'compliance'],
                    created_at: '2024-07-01T09:00:00Z'
                },
                {
                    id: 'ke-004',
                    content: 'PostgreSQL chosen as primary database for ACID compliance and JSON support. Migration from MongoDB completed Q3 2024.',
                    source: 'github',
                    team_id: this.teamId,
                    user_id: 'architect',
                    category: 'architecture',
                    tags: ['database', 'postgresql'],
                    created_at: '2024-09-20T11:00:00Z'
                },
                {
                    id: 'ke-005',
                    content: 'All new features must be behind feature flags. Use LaunchDarkly for flag management.',
                    source: 'slack',
                    team_id: this.teamId,
                    user_id: 'pm-lead',
                    category: 'process',
                    tags: ['feature-flags', 'rollout'],
                    created_at: '2024-09-10T16:00:00Z'
                }
            ],
            count: 5
        };
    }

    private getMockConstraintsList(): { constraints: ConstraintFull[]; count: number } {
        return {
            constraints: [
                {
                    id: 'con-001',
                    team_id: this.teamId,
                    type: 'security',
                    name: 'Token Expiry Limit',
                    description: 'Access token expiry must be ≤ 15 minutes',
                    severity: 'critical',
                    scope: {
                        files: ['src/auth/*', 'src/middleware/auth*'],
                        components: ['authentication']
                    },
                    threshold: { max_expiry_seconds: 900 },
                    enforcement: 'hard',
                    approved_by: 'security-lead',
                    approved_at: '2024-10-15T10:00:00Z',
                    is_active: true,
                    created_at: '2024-10-15T10:00:00Z'
                },
                {
                    id: 'con-002',
                    team_id: this.teamId,
                    type: 'performance',
                    name: 'API Latency SLA',
                    description: 'API response time must be < 100ms at p95',
                    severity: 'high',
                    scope: {
                        files: ['src/api/*'],
                        components: ['api']
                    },
                    threshold: { max_latency_ms: 100, percentile: 95 },
                    enforcement: 'soft',
                    approved_by: 'cto',
                    approved_at: '2024-09-01T14:00:00Z',
                    is_active: true,
                    created_at: '2024-09-01T14:00:00Z'
                },
                {
                    id: 'con-003',
                    team_id: this.teamId,
                    type: 'regulatory',
                    name: 'Payment Code Lock',
                    description: 'Payment processing code requires CFO approval for any changes',
                    severity: 'critical',
                    scope: {
                        files: ['src/payments/*', 'src/billing/*'],
                        components: ['payments', 'billing']
                    },
                    threshold: {},
                    enforcement: 'hard',
                    approved_by: 'cfo',
                    approved_at: '2024-07-01T09:00:00Z',
                    is_active: true,
                    created_at: '2024-07-01T09:00:00Z'
                },
                {
                    id: 'con-004',
                    team_id: this.teamId,
                    type: 'architecture',
                    name: 'Database Direct Access Ban',
                    description: 'No direct SQL queries outside repository layer',
                    severity: 'high',
                    scope: {
                        files: ['src/api/*', 'src/services/*'],
                        components: ['api', 'services']
                    },
                    threshold: {},
                    enforcement: 'soft',
                    approved_by: 'architect',
                    approved_at: '2024-08-15T11:00:00Z',
                    is_active: true,
                    created_at: '2024-08-15T11:00:00Z'
                },
                {
                    id: 'con-005',
                    team_id: this.teamId,
                    type: 'security',
                    name: 'No Secrets in Code',
                    description: 'API keys, passwords, and secrets must never be hardcoded',
                    severity: 'critical',
                    scope: {
                        files: ['**/*'],
                        components: []
                    },
                    threshold: {},
                    enforcement: 'hard',
                    approved_by: 'security-lead',
                    approved_at: '2024-06-01T08:00:00Z',
                    is_active: true,
                    created_at: '2024-06-01T08:00:00Z'
                }
            ],
            count: 5
        };
    }

    private getMockConstraintCheck(filePath: string): ConstraintCheck {
        const isAuthFile = filePath.toLowerCase().includes('auth');
        const isPaymentFile = filePath.toLowerCase().includes('payment');
        
        if (isPaymentFile) {
            return {
                file_path: filePath,
                has_violations: true,
                has_warnings: false,
                violations: [
                    {
                        constraint_id: 'con-003',
                        name: 'Payment Code Lock',
                        description: 'Payment processing code requires CFO approval for any changes',
                        severity: 'critical',
                        type: 'regulatory',
                        enforcement: 'hard',
                        approved_by: 'cfo'
                    }
                ],
                warnings: [],
                can_proceed: false
            };
        }
        
        if (isAuthFile) {
            return {
                file_path: filePath,
                has_violations: false,
                has_warnings: true,
                violations: [],
                warnings: [
                    {
                        constraint_id: 'con-001',
                        name: 'Token Expiry Limit',
                        description: 'Access token expiry must be ≤ 15 minutes',
                        severity: 'critical',
                        type: 'security',
                        enforcement: 'hard',
                        approved_by: 'security-lead'
                    }
                ],
                can_proceed: true
            };
        }
        
        return {
            file_path: filePath,
            has_violations: false,
            has_warnings: false,
            violations: [],
            warnings: [],
            can_proceed: true
        };
    }
}
