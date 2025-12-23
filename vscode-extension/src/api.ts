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
    alternatives_considered: Alternative[];
    affected_files: string[];
    affected_components: string[];
    context?: string;
    impact?: string;
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
    challenge_id: string;
    decision_found: boolean;
    decision?: DecisionDetail;
    original_reasoning: string;
    related_discussions: RelatedDiscussion[];
    ai_analysis: string;
    alternatives_considered: Alternative[];
    suggested_alternatives: string[];
    confidence: number;
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
    team_id: string;
    assigned_to?: string;
    due_date?: string;
    created_at: string;
}

export interface ActivityItem {
    id: string;
    type: string;
    title: string;
    user: string;
    timestamp: string;
    source_url?: string;
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
    // KNOWLEDGE QUERIES
    // ========================================================================

    async queryKnowledge(query: string): Promise<{ response: string; sources: any[] | null }> {
        const { data } = await this.client.post('/query', {
            query,
            team_id: this.teamId,
            user_id: this.username
        });
        return data;
    }

    async storeKnowledge(content: string, source: string): Promise<void> {
        await this.client.post('/store', {
            content,
            source,
            team_id: this.teamId
        });
    }

    async searchKnowledge(query: string): Promise<{ results: any[] }> {
        const { data } = await this.client.post('/search', {
            query,
            team_id: this.teamId
        });
        return data;
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
        const { data } = await this.client.get('/decisions', {
            params: { team_id: this.teamId, category, file_path: filePath }
        });
        return data;
    }

    async getDecision(decisionId: string): Promise<DecisionDetail> {
        const { data } = await this.client.get(`/decisions/${decisionId}`);
        return data;
    }

    async challengeDecision(question: string, decisionId?: string): Promise<ChallengeResult> {
        const { data } = await this.client.post('/challenge', {
            question,
            team_id: this.teamId,
            challenger_id: this.username,
            decision_id: decisionId
        });
        return data;
    }

    async getDecisionTrace(filePath: string): Promise<DecisionDetail[]> {
        try {
            const { data } = await this.client.get('/decisions/trace', {
                params: { team_id: this.teamId, file_path: filePath }
            });
            return data;
        } catch (error) {
            // Fallback to regular decisions filtered by file
            const decisions = await this.getDecisions(undefined, filePath);
            return decisions as DecisionDetail[];
        }
    }

    // ========================================================================
    // TASKS
    // ========================================================================

    async getTasks(): Promise<TaskItem[]> {
        const { data } = await this.client.get('/tasks', {
            params: {
                team_id: this.teamId,
                assigned_to: this.username
            }
        });
        return data;
    }

    async updateTask(taskId: string, updates: Partial<TaskItem>): Promise<void> {
        await this.client.patch(`/tasks/${taskId}`, updates);
    }

    // ========================================================================
    // ACTIVITIES
    // ========================================================================

    async getActivities(): Promise<ActivityItem[]> {
        const { data } = await this.client.get('/activities/team', {
            params: {
                team_id: this.teamId,
                limit: 20
            }
        });
        return data;
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
            }
        ];
    }
}
