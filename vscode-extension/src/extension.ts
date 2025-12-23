import * as vscode from 'vscode';
import { SupymemAPI } from './api';
import { TasksProvider, TaskItem } from './providers/tasks';
import { DecisionsProvider, DecisionItem } from './providers/decisions';
import { ActivityProvider } from './providers/activity';
import { AgentStatusProvider, AgentStatusPanel } from './providers/agents';
import { IntentPanelProvider } from './panels/IntentPanel';
import { DecisionTracePanel } from './panels/DecisionTrace';
import { ChangeWatcher } from './panels/ChangeWarningPanel';
import { ConstraintDecorations, ConstraintCodeLensProvider } from './decorations/constraints';
import { KnowledgeManagerPanel } from './panels/KnowledgeManager';

let api: SupymemAPI;
let statusBarItem: vscode.StatusBarItem;
let agentStatusBarItem: vscode.StatusBarItem;
let changeWatcher: ChangeWatcher;
let constraintDecorations: ConstraintDecorations;

export function activate(context: vscode.ExtensionContext) {
    console.log('Supymem AI Control Plane activated');

    // Initialize API client
    const config = vscode.workspace.getConfiguration('supymem');
    const apiUrl = config.get<string>('apiUrl') || 'http://localhost:8000';
    const teamId = config.get<string>('teamId') || 'default';
    const username = config.get<string>('username') || 'vscode-user';
    
    api = new SupymemAPI(apiUrl, teamId, username);

    // ========================================================================
    // STATUS BAR ITEMS
    // ========================================================================

    // Main status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'supymem.askAgent';
    statusBarItem.text = '$(brain) Supymem';
    statusBarItem.tooltip = 'Click to ask the knowledge agent (Cmd+Shift+K)';
    context.subscriptions.push(statusBarItem);

    // Agent status bar item
    agentStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    agentStatusBarItem.command = 'supymem.showAgentStatus';
    agentStatusBarItem.text = '$(robot) Agents';
    agentStatusBarItem.tooltip = 'View AI Agent Status';
    context.subscriptions.push(agentStatusBarItem);

    // Check connection and update status bar
    checkConnection();

    // ========================================================================
    // SIDEBAR PROVIDERS
    // ========================================================================

    // Intent Panel (WebView)
    const intentProvider = new IntentPanelProvider(context.extensionUri, api);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            IntentPanelProvider.viewType,
            intentProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Tree View Providers
    const tasksProvider = new TasksProvider(api);
    const decisionsProvider = new DecisionsProvider(api);
    const activityProvider = new ActivityProvider(api);
    const agentsProvider = new AgentStatusProvider(api);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('supymem.tasks', tasksProvider),
        vscode.window.registerTreeDataProvider('supymem.decisions', decisionsProvider),
        vscode.window.registerTreeDataProvider('supymem.activity', activityProvider),
        vscode.window.registerTreeDataProvider('supymem.agents', agentsProvider)
    );

    // ========================================================================
    // CHANGE WATCHER & DECORATIONS
    // ========================================================================

    changeWatcher = new ChangeWatcher(api);
    context.subscriptions.push(changeWatcher.startWatching());

    constraintDecorations = new ConstraintDecorations(api);
    const decorationDisposables = constraintDecorations.startWatching();
    decorationDisposables.forEach(d => context.subscriptions.push(d));

    // Code Lens Provider
    const codeLensProvider = new ConstraintCodeLensProvider(api);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );

    // ========================================================================
    // REGISTER COMMANDS
    // ========================================================================

    context.subscriptions.push(
        // Main knowledge commands
        vscode.commands.registerCommand('supymem.askAgent', askAgentCommand),
        vscode.commands.registerCommand('supymem.whyDecision', whyDecisionCommand),
        vscode.commands.registerCommand('supymem.whoKnows', whoKnowsCommand),
        vscode.commands.registerCommand('supymem.storeKnowledge', storeKnowledgeCommand),
        vscode.commands.registerCommand('supymem.viewDecisions', viewDecisionsCommand),
        vscode.commands.registerCommand('supymem.myTasks', () => tasksProvider.refresh()),

        // Intent & Context commands
        vscode.commands.registerCommand('supymem.showIntentPanel', () => {
            vscode.commands.executeCommand('supymem.intentPanel.focus');
        }),
        vscode.commands.registerCommand('supymem.showDecisionTrace', showDecisionTraceCommand),
        
        // Ask Why commands (context menu)
        vscode.commands.registerCommand('supymem.whyExists', whyExistsCommand),
        vscode.commands.registerCommand('supymem.whatBreaks', whatBreaksCommand),
        
        // Change analysis commands
        vscode.commands.registerCommand('supymem.analyzeChange', () => {
            changeWatcher.analyzeCurrentChanges(context.extensionUri);
        }),
        vscode.commands.registerCommand('supymem.checkConstraints', checkConstraintsCommand),
        
        // Agent commands
        vscode.commands.registerCommand('supymem.showAgentStatus', () => {
            AgentStatusPanel.show(context.extensionUri, api);
        }),
        
        // Knowledge Manager command
        vscode.commands.registerCommand('supymem.showKnowledgeManager', () => {
            KnowledgeManagerPanel.show(context.extensionUri, api);
        }),
        
        // Decoration commands
        vscode.commands.registerCommand('supymem.toggleConstraintMarkers', () => {
            constraintDecorations.toggle();
        }),

        // Tree item commands
        vscode.commands.registerCommand('supymem.toggleTask', toggleTaskCommand),
        vscode.commands.registerCommand('supymem.viewDecision', viewDecisionCommand),

        // Refresh commands
        vscode.commands.registerCommand('supymem.refreshTasks', () => tasksProvider.refresh()),
        vscode.commands.registerCommand('supymem.refreshDecisions', () => decisionsProvider.refresh()),
        vscode.commands.registerCommand('supymem.refreshActivity', () => activityProvider.refresh()),
        vscode.commands.registerCommand('supymem.refreshAgents', () => agentsProvider.refresh()),

        // Connection check
        vscode.commands.registerCommand('supymem.checkConnection', checkConnection)
    );

    // ========================================================================
    // AUTO-REFRESH
    // ========================================================================

    const refreshInterval = config.get<number>('autoRefreshInterval', 60) * 1000;
    if (refreshInterval > 0) {
        const intervalId = setInterval(() => {
            tasksProvider.refresh();
            activityProvider.refresh();
            agentsProvider.refresh();
            checkConnection();
        }, refreshInterval);

        context.subscriptions.push({
            dispose: () => clearInterval(intervalId)
        });
    }

    // ========================================================================
    // CONFIGURATION CHANGES
    // ========================================================================

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('supymem')) {
                const newConfig = vscode.workspace.getConfiguration('supymem');
                const newApiUrl = newConfig.get<string>('apiUrl') || 'http://localhost:8000';
                const newTeamId = newConfig.get<string>('teamId') || 'default';
                const newUsername = newConfig.get<string>('username') || 'vscode-user';
                
                api = new SupymemAPI(newApiUrl, newTeamId, newUsername);
                checkConnection();
                
                // Update all providers
                tasksProvider.updateApi(api);
                decisionsProvider.updateApi(api);
                activityProvider.updateApi(api);
                agentsProvider.updateApi(api);
                intentProvider.updateApi(api);
                changeWatcher.updateApi(api);
                constraintDecorations.updateApi(api);
                codeLensProvider.updateApi(api);
            }
        })
    );

    // ========================================================================
    // SHOW READY MESSAGE
    // ========================================================================

    statusBarItem.show();
    agentStatusBarItem.show();
    
    vscode.window.showInformationMessage(
        '🎯 Supymem AI Control Plane ready! Press Cmd+Shift+K to ask a question.'
    );
}

// ============================================================================
// CONNECTION CHECK
// ============================================================================

async function checkConnection() {
    try {
        await api.healthCheck();
        statusBarItem.text = '$(brain) Supymem';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Connected - Click to ask the knowledge agent';
    } catch (error) {
        statusBarItem.text = '$(brain) Supymem $(warning)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = 'Disconnected - Click to retry connection';
    }
}

// ============================================================================
// COMMAND IMPLEMENTATIONS
// ============================================================================

async function askAgentCommand() {
    const query = await vscode.window.showInputBox({
        prompt: 'Ask the knowledge agent',
        placeHolder: 'e.g., "What\'s the architecture of the auth system?"'
    });

    if (!query) {
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Supymem: Thinking...',
        cancellable: false
    }, async () => {
        try {
            const response = await api.queryKnowledge(query);
            
            const panel = vscode.window.createWebviewPanel(
                'supymemResponse',
                'Supymem Response',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getResponseWebviewContent(query, response.response, response.sources);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Supymem error: ${error.message}`);
        }
    });
}

async function whyDecisionCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open');
        return;
    }

    const filePath = editor.document.fileName;
    const selection = editor.document.getText(editor.selection);
    
    const query = selection 
        ? `Why was this decided: "${selection.slice(0, 100)}"?`
        : `What decisions were made about ${filePath}?`;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Supymem: Searching decisions...',
        cancellable: false
    }, async () => {
        try {
            const result = await api.challengeDecision(query);
            
            const panel = vscode.window.createWebviewPanel(
                'supymemDecision',
                'Decision Context',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getChallengeWebviewContent(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Supymem error: ${error.message}`);
        }
    });
}

async function whoKnowsCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open');
        return;
    }

    const filePath = editor.document.fileName;
    const query = `Who is the expert on ${filePath}?`;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Supymem: Finding experts...',
        cancellable: false
    }, async () => {
        try {
            const response = await api.queryKnowledge(query);
            
            vscode.window.showInformationMessage(
                response.response.slice(0, 200),
                'View Full Response'
            ).then((selection) => {
                if (selection) {
                    const panel = vscode.window.createWebviewPanel(
                        'supymemExperts',
                        'File Experts',
                        vscode.ViewColumn.Beside,
                        { enableScripts: false }
                    );
                    panel.webview.html = getResponseWebviewContent(query, response.response, null);
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Supymem error: ${error.message}`);
        }
    });
}

async function storeKnowledgeCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Select text to store');
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showWarningMessage('Please select text to store');
        return;
    }

    try {
        await api.storeKnowledge(selection, 'vscode');
        vscode.window.showInformationMessage('Knowledge stored successfully!');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to store: ${error.message}`);
    }
}

async function viewDecisionsCommand() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Loading decisions...',
        cancellable: false
    }, async () => {
        try {
            const decisions = await api.getDecisions();
            
            if (!decisions || decisions.length === 0) {
                vscode.window.showInformationMessage('No decisions found for your team.');
                return;
            }

            const items = decisions.map((d: any) => ({
                label: d.title,
                description: d.category,
                detail: d.summary,
                decision: d
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a decision to view'
            });

            if (selected) {
                const result = await api.challengeDecision(
                    `Explain this decision: "${selected.label}"`,
                    selected.decision.id
                );
                
                const panel = vscode.window.createWebviewPanel(
                    'supymemDecision',
                    selected.label,
                    vscode.ViewColumn.Beside,
                    { enableScripts: false }
                );
                panel.webview.html = getChallengeWebviewContent(result, selected.label);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load: ${error.message}`);
        }
    });
}

async function showDecisionTraceCommand(filePath?: string) {
    const path = filePath || vscode.window.activeTextEditor?.document.uri.fsPath;
    
    if (!path) {
        vscode.window.showWarningMessage('No file selected');
        return;
    }

    await DecisionTracePanel.createOrShow(
        vscode.extensions.getExtension('supymem.supymem')?.extensionUri || vscode.Uri.file(''),
        api,
        path
    );
}

async function whyExistsCommand(filePathOrUri?: string | vscode.Uri) {
    let filePath: string;
    
    if (typeof filePathOrUri === 'string') {
        filePath = filePathOrUri;
    } else if (filePathOrUri instanceof vscode.Uri) {
        filePath = filePathOrUri.fsPath;
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No file open');
            return;
        }
        filePath = editor.document.uri.fsPath;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing why this exists...',
        cancellable: false
    }, async () => {
        try {
            const result = await api.whyExists(filePath);
            
            const panel = vscode.window.createWebviewPanel(
                'supymemWhyExists',
                'Why This Exists',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getWhyExistsWebviewContent(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to analyze: ${error.message}`);
        }
    });
}

async function whatBreaksCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open');
        return;
    }

    const filePath = editor.document.uri.fsPath;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing impact...',
        cancellable: false
    }, async () => {
        try {
            const result = await api.whatBreaks(filePath);
            
            const panel = vscode.window.createWebviewPanel(
                'supymemWhatBreaks',
                'What Would Break',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getWhatBreaksWebviewContent(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to analyze: ${error.message}`);
        }
    });
}

async function checkConstraintsCommand() {
    const editor = vscode.window.activeTextEditor;
    const filePath = editor?.document.uri.fsPath;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Checking constraints...',
        cancellable: false
    }, async () => {
        try {
            const constraints = await api.getActiveConstraints(filePath);
            
            if (constraints.length === 0) {
                vscode.window.showInformationMessage('No active constraints for this scope.');
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'supymemConstraints',
                'Active Constraints',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getConstraintsWebviewContent(constraints);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to check constraints: ${error.message}`);
        }
    });
}

async function toggleTaskCommand(taskItem: TaskItem) {
    if (!taskItem) {
        return;
    }

    const newStatus = taskItem.status === 'completed' ? 'pending' : 'completed';
    
    try {
        await api.updateTask(taskItem.taskId, { status: newStatus });
        vscode.window.showInformationMessage(
            `Task "${taskItem.title}" marked as ${newStatus}`
        );
        vscode.commands.executeCommand('supymem.refreshTasks');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update task: ${error.message}`);
    }
}

async function viewDecisionCommand(decisionItem: DecisionItem | { decisionId: string }) {
    if (!decisionItem) {
        return;
    }

    const decisionId = 'decisionId' in decisionItem ? decisionItem.decisionId : (decisionItem as DecisionItem).decisionId;
    const title = 'title' in decisionItem ? (decisionItem as DecisionItem).title : 'Decision';

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Loading decision details...',
        cancellable: false
    }, async () => {
        try {
            const result = await api.challengeDecision(
                `Explain this decision in detail`,
                decisionId
            );
            
            const panel = vscode.window.createWebviewPanel(
                'supymemDecision',
                `Decision: ${title}`,
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getChallengeWebviewContent(result, title);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load decision: ${error.message}`);
        }
    });
}

// ============================================================================
// WEBVIEW HTML GENERATORS
// ============================================================================

function getBaseStyles(): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: var(--vscode-font-family); 
            padding: 24px; 
            background: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
        }
        h1, h2, h3 { color: var(--vscode-foreground); margin-bottom: 12px; }
        h1 { font-size: 22px; border-bottom: 2px solid var(--vscode-panel-border); padding-bottom: 12px; }
        h2 { font-size: 16px; color: var(--vscode-textLink-foreground); margin-top: 24px; }
        h3 { font-size: 14px; margin-top: 16px; }
        p { margin-bottom: 12px; }
        .query { 
            padding: 16px; 
            background: var(--vscode-textBlockQuote-background); 
            border-left: 4px solid var(--vscode-textLink-foreground); 
            margin-bottom: 24px; 
            border-radius: 0 8px 8px 0;
        }
        .response { line-height: 1.8; white-space: pre-wrap; }
        .section {
            background: var(--vscode-textBlockQuote-background);
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
        }
        .meta { 
            font-size: 12px; 
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin: 12px 0;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .badge-critical { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        .badge-high { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
        .badge-medium { background: rgba(255, 204, 0, 0.2); color: #ccaa00; }
        .badge-low { background: rgba(68, 187, 68, 0.2); color: #44bb44; }
        .list { list-style: none; padding: 0; }
        .list li { padding: 8px 0; border-bottom: 1px solid var(--vscode-panel-border); }
        .list li:last-child { border-bottom: none; }
        code {
            background: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
        }
        strong { color: var(--vscode-textLink-foreground); }
    `;
}

function getResponseWebviewContent(query: string, response: string, sources: any[] | null): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${getBaseStyles()}</style>
</head>
<body>
    <h1>🧠 Supymem Response</h1>
    <div class="query"><strong>Q:</strong> ${escapeHtml(query)}</div>
    <div class="response">${formatMarkdown(response)}</div>
    ${sources && sources.length > 0 ? `
    <h2>📚 Sources</h2>
    <ul class="list">
        ${sources.map((s: any) => `
            <li>
                <span class="badge">${escapeHtml(s.source || 'unknown')}</span>
                ${escapeHtml((s.content || '').slice(0, 150))}...
            </li>
        `).join('')}
    </ul>
    ` : ''}
</body>
</html>`;
}

function getChallengeWebviewContent(result: any, title?: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${getBaseStyles()}</style>
</head>
<body>
    ${result.decision ? `
    <h1>📋 ${escapeHtml(title || result.decision.title || 'Decision')}</h1>
    <div class="meta">
        ${result.decision.category ? `<span>📁 ${escapeHtml(result.decision.category)}</span>` : ''}
        ${result.decision.decided_by ? `<span>👤 @${escapeHtml(result.decision.decided_by)}</span>` : ''}
        ${result.decision.created_at ? `<span>📅 ${new Date(result.decision.created_at).toLocaleDateString()}</span>` : ''}
    </div>
    ${result.original_reasoning ? `
    <div class="section">
        <strong>Original Reasoning:</strong>
        <p>${escapeHtml(result.original_reasoning)}</p>
    </div>
    ` : ''}
    ` : `<h1>🔍 ${escapeHtml(title || 'Analysis')}</h1>`}
    
    <h2>Analysis</h2>
    <div class="response">${formatMarkdown(result.ai_analysis || result.response || 'No analysis available.')}</div>
    
    ${result.suggested_alternatives && result.suggested_alternatives.length > 0 ? `
    <h2>💡 Suggested Alternatives</h2>
    <ul class="list">
        ${result.suggested_alternatives.map((a: string) => `<li>${escapeHtml(a)}</li>`).join('')}
    </ul>
    ` : ''}
    
    <p class="meta" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--vscode-panel-border);">
        ${result.confidence ? `Confidence: ${(result.confidence * 100).toFixed(0)}%` : ''}
    </p>
</body>
</html>`;
}

function getWhyExistsWebviewContent(result: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${getBaseStyles()}</style>
</head>
<body>
    <h1>❓ Why This Exists</h1>
    <p class="meta">
        <code>${escapeHtml(result.file_path.split(/[/\\]/).pop())}</code>
        ${result.created_by ? `• Created by @${escapeHtml(result.created_by)}` : ''}
        ${result.created_at ? `• ${new Date(result.created_at).toLocaleDateString()}` : ''}
    </p>
    
    <div class="section">
        <h3>📋 Purpose</h3>
        <p>${escapeHtml(result.purpose)}</p>
    </div>

    ${result.dependencies?.length ? `
    <h2>📥 Dependencies</h2>
    <ul class="list">
        ${result.dependencies.map((d: string) => `<li><code>${escapeHtml(d)}</code></li>`).join('')}
    </ul>
    ` : ''}

    ${result.dependents?.length ? `
    <h2>📤 Dependents</h2>
    <ul class="list">
        ${result.dependents.map((d: string) => `<li><code>${escapeHtml(d)}</code></li>`).join('')}
    </ul>
    ` : ''}

    ${result.related_decisions?.length ? `
    <h2>📋 Related Decisions</h2>
    <ul class="list">
        ${result.related_decisions.map((d: any) => `
            <li>
                <strong>${escapeHtml(d.title)}</strong>
                ${d.summary ? `<br><span style="color: var(--vscode-descriptionForeground);">${escapeHtml(d.summary)}</span>` : ''}
            </li>
        `).join('')}
    </ul>
    ` : ''}
</body>
</html>`;
}

function getWhatBreaksWebviewContent(result: any): string {
    const riskColors: Record<string, string> = {
        critical: '#ff4444',
        high: '#ff8800',
        medium: '#ffcc00',
        low: '#44bb44'
    };

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        ${getBaseStyles()}
        .risk-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-weight: 600;
            background: ${riskColors[result.risk_level] || '#888'}22;
            color: ${riskColors[result.risk_level] || '#888'};
        }
    </style>
</head>
<body>
    <h1>⚠️ What Would Break</h1>
    <p class="meta">
        <code>${escapeHtml(result.file_path.split(/[/\\]/).pop())}</code>
        <span class="risk-badge">${result.risk_level.toUpperCase()} RISK</span>
    </p>
    
    <div class="section">
        <h3>📊 Impact Summary</h3>
        <p>${escapeHtml(result.impact_summary)}</p>
    </div>

    ${result.dependents?.length ? `
    <h2>🔗 Dependent Files (${result.dependents.length})</h2>
    <ul class="list">
        ${result.dependents.map((d: any) => `
            <li>
                <code>${escapeHtml(d.file)}</code>
                <span class="badge badge-${d.importance}">${d.importance}</span>
                <span style="color: var(--vscode-descriptionForeground);">${escapeHtml(d.usage_type)}</span>
            </li>
        `).join('')}
    </ul>
    ` : ''}

    ${result.affected_tests?.length ? `
    <h2>🧪 Affected Tests (${result.affected_tests.length})</h2>
    <ul class="list">
        ${result.affected_tests.map((t: string) => `<li><code>${escapeHtml(t)}</code></li>`).join('')}
    </ul>
    ` : ''}

    ${result.recommendations?.length ? `
    <h2>💡 Recommendations</h2>
    <ul class="list">
        ${result.recommendations.map((r: string) => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
    ` : ''}
</body>
</html>`;
}

function getConstraintsWebviewContent(constraints: any[]): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        ${getBaseStyles()}
        .constraint {
            background: var(--vscode-textBlockQuote-background);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 4px solid;
        }
        .constraint.critical { border-color: #ff4444; }
        .constraint.high { border-color: #ff8800; }
        .constraint.medium { border-color: #ffcc00; }
        .constraint.low { border-color: #44bb44; }
    </style>
</head>
<body>
    <h1>⚡ Active Constraints</h1>
    <p class="meta">${constraints.length} constraints active</p>
    
    ${constraints.map(c => `
        <div class="constraint ${c.severity}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>${c.type === 'security' ? '🔒' : c.type === 'performance' ? '⚡' : c.type === 'cost' ? '💰' : '📌'} ${escapeHtml(c.type)}</strong>
                <span class="badge badge-${c.severity}">${c.severity}</span>
            </div>
            <p>${escapeHtml(c.description)}</p>
            ${c.approved_by ? `<p class="meta">Approved by @${escapeHtml(c.approved_by)}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeHtml(text: string): string {
    if (!text) {return '';}
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMarkdown(text: string): string {
    if (!text) {return '';}
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
        .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
        .replace(/- (.*?)(<br>|$)/g, '• $1<br>');
}

// ============================================================================
// DEACTIVATE
// ============================================================================

export function deactivate() {
    console.log('Supymem AI Control Plane deactivated');
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (agentStatusBarItem) {
        agentStatusBarItem.dispose();
    }
    if (changeWatcher) {
        changeWatcher.dispose();
    }
    if (constraintDecorations) {
        constraintDecorations.dispose();
    }
}
