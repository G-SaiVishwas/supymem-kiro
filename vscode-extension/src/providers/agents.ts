import * as vscode from 'vscode';
import { SupymemAPI, AgentStatus, AgentExecution } from '../api';

export class AgentStatusProvider implements vscode.TreeDataProvider<AgentItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AgentItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private agents: AgentStatus[] = [];
    private api: SupymemAPI;

    constructor(api: SupymemAPI) {
        this.api = api;
        this.refresh();
    }

    updateApi(api: SupymemAPI): void {
        this.api = api;
        this.refresh();
    }

    refresh(): void {
        this.loadAgents();
    }

    private async loadAgents() {
        try {
            this.agents = await this.api.getAgentStatus();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Failed to load agents:', error);
            this.agents = [];
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: AgentItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AgentItem): Thenable<AgentItem[]> {
        if (element) {
            // Show execution history for an agent
            if (element.agent) {
                const executions = element.agent.execution_history.slice(0, 5);
                return Promise.resolve(
                    executions.map(exec => new AgentItem(
                        exec.task,
                        exec.status,
                        null,
                        exec
                    ))
                );
            }
            return Promise.resolve([]);
        }

        if (this.agents.length === 0) {
            return Promise.resolve([new AgentItem(
                'No active agents',
                'idle',
                null,
                null,
                true
            )]);
        }

        const items = this.agents.map(agent => new AgentItem(
            agent.name,
            agent.status,
            agent,
            null
        ));

        return Promise.resolve(items);
    }
}

export class AgentItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly status: string,
        public readonly agent: AgentStatus | null,
        public readonly execution: AgentExecution | null,
        public readonly isPlaceholder: boolean = false
    ) {
        super(
            name,
            agent && agent.execution_history.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        if (isPlaceholder) {
            this.description = '';
            this.tooltip = 'No agents found';
            this.contextValue = 'placeholder';
            this.iconPath = new vscode.ThemeIcon('info');
            return;
        }

        if (execution) {
            // This is an execution history item
            this._setupExecutionItem(execution);
        } else if (agent) {
            // This is an agent item
            this._setupAgentItem(agent);
        }
    }

    private _setupAgentItem(agent: AgentStatus) {
        const statusIcons: Record<string, string> = {
            idle: 'circle-outline',
            executing: 'sync~spin',
            waiting_approval: 'bell-dot',
            error: 'error'
        };

        const statusLabels: Record<string, string> = {
            idle: '💤 Idle',
            executing: '⚡ Executing',
            waiting_approval: '🔔 Needs Approval',
            error: '❌ Error'
        };

        const statusColors: Record<string, vscode.ThemeColor | undefined> = {
            idle: undefined,
            executing: new vscode.ThemeColor('charts.blue'),
            waiting_approval: new vscode.ThemeColor('charts.orange'),
            error: new vscode.ThemeColor('charts.red')
        };

        this.description = statusLabels[agent.status] || agent.status;
        
        const tooltipLines = [
            `**${agent.name}**`,
            '',
            `- Status: ${agent.status}`,
            agent.current_task ? `- Current: ${agent.current_task}` : '',
            agent.pending_approvals > 0 ? `- Pending approvals: ${agent.pending_approvals}` : '',
            `- Last active: ${new Date(agent.last_active).toLocaleString()}`,
            '',
            agent.execution_history.length > 0 ? `*${agent.execution_history.length} executions in history*` : ''
        ].filter(Boolean);

        this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
        this.contextValue = agent.status === 'waiting_approval' ? 'agentNeedsApproval' : 'agent';
        this.iconPath = new vscode.ThemeIcon(
            statusIcons[agent.status] || 'robot',
            statusColors[agent.status]
        );

        if (agent.status === 'waiting_approval') {
            this.command = {
                command: 'supymem.showAgentApprovals',
                title: 'View Pending Approvals',
                arguments: [agent]
            };
        }
    }

    private _setupExecutionItem(execution: AgentExecution) {
        const statusIcons: Record<string, string> = {
            success: 'check',
            failed: 'error',
            cancelled: 'circle-slash'
        };

        const statusColors: Record<string, vscode.ThemeColor | undefined> = {
            success: new vscode.ThemeColor('charts.green'),
            failed: new vscode.ThemeColor('charts.red'),
            cancelled: new vscode.ThemeColor('charts.yellow')
        };

        const startTime = new Date(execution.started_at).toLocaleTimeString();
        this.description = `${execution.status} at ${startTime}`;
        this.tooltip = `${execution.task}\nStatus: ${execution.status}\nStarted: ${execution.started_at}`;
        this.contextValue = 'execution';
        this.iconPath = new vscode.ThemeIcon(
            statusIcons[execution.status] || 'circle-outline',
            statusColors[execution.status]
        );
    }
}

// ============================================================================
// AGENT STATUS WEBVIEW PANEL
// ============================================================================

export class AgentStatusPanel {
    public static currentPanel: AgentStatusPanel | undefined;
    public static readonly viewType = 'supymemAgentStatus';

    private readonly _panel: vscode.WebviewPanel;
    private _api: SupymemAPI;
    private _disposables: vscode.Disposable[] = [];

    public static async show(extensionUri: vscode.Uri, api: SupymemAPI) {
        const column = vscode.ViewColumn.Beside;

        if (AgentStatusPanel.currentPanel) {
            AgentStatusPanel.currentPanel._panel.reveal(column);
            await AgentStatusPanel.currentPanel._refresh();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            AgentStatusPanel.viewType,
            'Agent Status',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        AgentStatusPanel.currentPanel = new AgentStatusPanel(panel, api);
        await AgentStatusPanel.currentPanel._refresh();
    }

    private constructor(panel: vscode.WebviewPanel, api: SupymemAPI) {
        this._panel = panel;
        this._api = api;

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'refresh':
                        await this._refresh();
                        break;
                    case 'approve':
                        await this._approveAction(message.agentId, message.actionId);
                        break;
                    case 'reject':
                        await this._rejectAction(message.agentId, message.actionId);
                        break;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        AgentStatusPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private async _refresh() {
        this._panel.webview.html = this._getLoadingHtml();

        try {
            const agents = await this._api.getAgentStatus();
            this._panel.webview.html = this._getHtml(agents);
        } catch (error: any) {
            this._panel.webview.html = this._getErrorHtml(error.message);
        }
    }

    private async _approveAction(agentId: string, actionId: string) {
        try {
            await this._api.approveAgentAction(agentId, actionId);
            vscode.window.showInformationMessage('Action approved!');
            await this._refresh();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to approve: ${error.message}`);
        }
    }

    private async _rejectAction(agentId: string, actionId: string) {
        const reason = await vscode.window.showInputBox({
            prompt: 'Reason for rejection',
            placeHolder: 'Enter reason...'
        });

        if (reason) {
            try {
                await this._api.rejectAgentAction(agentId, actionId, reason);
                vscode.window.showInformationMessage('Action rejected.');
                await this._refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to reject: ${error.message}`);
            }
        }
    }

    private _getLoadingHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-editor-background);
            border-top: 3px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body><div class="spinner"></div></body>
</html>`;
    }

    private _getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 40px;
            text-align: center;
        }
        .error { color: var(--vscode-errorForeground); }
    </style>
</head>
<body>
    <h2>⚠️ Error</h2>
    <p class="error">${this._escapeHtml(message)}</p>
</body>
</html>`;
    }

    private _getHtml(agents: AgentStatus[]): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 24px;
            line-height: 1.5;
        }
        .container { max-width: 800px; margin: 0 auto; }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        .header h1 {
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .refresh-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .agents-grid {
            display: grid;
            gap: 16px;
        }
        
        .agent-card {
            background: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            padding: 20px;
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .agent-name {
            font-size: 16px;
            font-weight: 600;
        }
        .agent-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-idle { background: var(--vscode-editor-background); }
        .status-executing { background: rgba(68, 136, 255, 0.2); color: #4488ff; }
        .status-waiting_approval { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
        .status-error { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        
        .agent-current {
            font-size: 13px;
            color: var(--vscode-foreground);
            margin-bottom: 12px;
            padding: 10px;
            background: var(--vscode-editor-background);
            border-radius: 4px;
        }
        .agent-current strong {
            color: var(--vscode-textLink-foreground);
        }
        
        .approval-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        .btn-approve {
            background: rgba(68, 187, 68, 0.2);
            color: #44bb44;
            border: 1px solid #44bb44;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-reject {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
            border: 1px solid #ff4444;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .history {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .history-title {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .history-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            padding: 4px 0;
        }
        .history-icon {
            font-size: 14px;
        }
        .history-task {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .history-time {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
        }
        
        .empty {
            text-align: center;
            padding: 60px 20px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Agent Status</h1>
            <button class="refresh-btn" onclick="vscode.postMessage({type: 'refresh'})">↻ Refresh</button>
        </div>

        ${agents.length === 0 ? `
            <div class="empty">
                <div class="empty-icon">🤖</div>
                <h3>No Active Agents</h3>
                <p>No agents are currently running.</p>
            </div>
        ` : `
            <div class="agents-grid">
                ${agents.map(agent => this._renderAgent(agent)).join('')}
            </div>
        `}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private _renderAgent(agent: AgentStatus): string {
        const statusIcons: Record<string, string> = {
            idle: '💤',
            executing: '⚡',
            waiting_approval: '🔔',
            error: '❌'
        };

        const statusLabels: Record<string, string> = {
            idle: 'Idle',
            executing: 'Executing',
            waiting_approval: 'Needs Approval',
            error: 'Error'
        };

        const historyIcons: Record<string, string> = {
            success: '✅',
            failed: '❌',
            cancelled: '⏹️'
        };

        return `
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-name">${this._escapeHtml(agent.name)}</div>
                    <span class="agent-status status-${agent.status}">
                        ${statusIcons[agent.status] || '❓'} ${statusLabels[agent.status] || agent.status}
                    </span>
                </div>

                ${agent.current_task ? `
                    <div class="agent-current">
                        <strong>Current:</strong> ${this._escapeHtml(agent.current_task)}
                    </div>
                ` : ''}

                ${agent.status === 'waiting_approval' ? `
                    <div class="approval-actions">
                        <button class="btn-approve" onclick="vscode.postMessage({type: 'approve', agentId: '${agent.id}', actionId: 'current'})">
                            ✓ Approve
                        </button>
                        <button class="btn-reject" onclick="vscode.postMessage({type: 'reject', agentId: '${agent.id}', actionId: 'current'})">
                            ✕ Reject
                        </button>
                    </div>
                ` : ''}

                ${agent.execution_history.length > 0 ? `
                    <div class="history">
                        <div class="history-title">Recent Executions</div>
                        ${agent.execution_history.slice(0, 3).map(exec => `
                            <div class="history-item">
                                <span class="history-icon">${historyIcons[exec.status] || '❓'}</span>
                                <span class="history-task">${this._escapeHtml(exec.task)}</span>
                                <span class="history-time">${new Date(exec.started_at).toLocaleTimeString()}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    private _escapeHtml(text: string): string {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

