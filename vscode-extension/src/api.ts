import axios, { AxiosInstance } from 'axios';

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

    async healthCheck(): Promise<boolean> {
        const baseUrl = this.client.defaults.baseURL?.replace('/api/v1', '') || '';
        const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
        return response.status === 200;
    }

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

    async getTasks(): Promise<any[]> {
        const { data } = await this.client.get('/tasks', {
            params: {
                team_id: this.teamId,
                assigned_to: this.username
            }
        });
        return data;
    }

    async updateTask(taskId: string, updates: any): Promise<void> {
        await this.client.patch(`/tasks/${taskId}`, updates);
    }

    async getDecisions(): Promise<any[]> {
        const { data } = await this.client.get('/decisions', {
            params: { team_id: this.teamId }
        });
        return data;
    }

    async getDecision(decisionId: string): Promise<any> {
        const { data } = await this.client.get(`/decisions/${decisionId}`);
        return data;
    }

    async challengeDecision(question: string, decisionId?: string): Promise<any> {
        const { data } = await this.client.post('/challenge', {
            question,
            team_id: this.teamId,
            challenger_id: this.username,
            decision_id: decisionId
        });
        return data;
    }

    async getActivities(): Promise<any[]> {
        const { data } = await this.client.get('/activities/team', {
            params: {
                team_id: this.teamId,
                limit: 20
            }
        });
        return data;
    }
}
