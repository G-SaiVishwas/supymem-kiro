import * as vscode from 'vscode';
import { SupymemAPI } from './api';
import { TasksProvider, TaskItem } from './providers/tasks';
import { DecisionsProvider, DecisionItem } from './providers/decisions';
import { ActivityProvider } from './providers/activity';

let api: SupymemAPI;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Supymem extension activated');

    // Initialize API client
    const config = vscode.workspace.getConfiguration('supymem');
    const apiUrl = config.get<string>('apiUrl') || 'http://localhost:8000';
    const teamId = config.get<string>('teamId') || 'default';
    const username = config.get<string>('username') || 'vscode-user';
    
    api = new SupymemAPI(apiUrl, teamId, username);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'supymem.askAgent';
    statusBarItem.text = '$(brain) Supymem';
    statusBarItem.tooltip = 'Click to ask the knowledge agent';
    context.subscriptions.push(statusBarItem);
    
    // Check connection and update status bar
    checkConnection();

    // Register tree view providers
    const tasksProvider = new TasksProvider(api);
    const decisionsProvider = new DecisionsProvider(api);
    const activityProvider = new ActivityProvider(api);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('supymem.tasks', tasksProvider),
        vscode.window.registerTreeDataProvider('supymem.decisions', decisionsProvider),
        vscode.window.registerTreeDataProvider('supymem.activity', activityProvider)
    );

    // Register all commands
    context.subscriptions.push(
        // Main commands
        vscode.commands.registerCommand('supymem.askAgent', askAgentCommand),
        vscode.commands.registerCommand('supymem.whyDecision', whyDecisionCommand),
        vscode.commands.registerCommand('supymem.whoKnows', whoKnowsCommand),
        vscode.commands.registerCommand('supymem.storeKnowledge', storeKnowledgeCommand),
        vscode.commands.registerCommand('supymem.viewDecisions', viewDecisionsCommand),
        vscode.commands.registerCommand('supymem.myTasks', () => tasksProvider.refresh()),
        
        // Tree item commands
        vscode.commands.registerCommand('supymem.toggleTask', toggleTaskCommand),
        vscode.commands.registerCommand('supymem.viewDecision', viewDecisionCommand),
        
        // Refresh commands
        vscode.commands.registerCommand('supymem.refreshTasks', () => tasksProvider.refresh()),
        vscode.commands.registerCommand('supymem.refreshDecisions', () => decisionsProvider.refresh()),
        vscode.commands.registerCommand('supymem.refreshActivity', () => activityProvider.refresh()),
        
        // Check connection command
        vscode.commands.registerCommand('supymem.checkConnection', checkConnection)
    );

    // Refresh views periodically
    const refreshInterval = setInterval(() => {
        tasksProvider.refresh();
        activityProvider.refresh();
        checkConnection();
    }, 60000); // Every minute

    context.subscriptions.push({
        dispose: () => clearInterval(refreshInterval)
    });

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('supymem')) {
                const newConfig = vscode.workspace.getConfiguration('supymem');
                const newApiUrl = newConfig.get<string>('apiUrl') || 'http://localhost:8000';
                const newTeamId = newConfig.get<string>('teamId') || 'default';
                const newUsername = newConfig.get<string>('username') || 'vscode-user';
                
                api = new SupymemAPI(newApiUrl, newTeamId, newUsername);
                checkConnection();
                
                tasksProvider.updateApi(api);
                decisionsProvider.updateApi(api);
                activityProvider.updateApi(api);
            }
        })
    );

    statusBarItem.show();
    vscode.window.showInformationMessage('Supymem: Ready to assist! Press Cmd+Shift+K to ask a question.');
}

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

async function viewDecisionCommand(decisionItem: DecisionItem) {
    if (!decisionItem) {
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Loading decision details...',
        cancellable: false
    }, async () => {
        try {
            const result = await api.challengeDecision(
                `Explain this decision in detail: "${decisionItem.title}"`,
                decisionItem.decisionId
            );
            
            const panel = vscode.window.createWebviewPanel(
                'supymemDecision',
                `Decision: ${decisionItem.title}`,
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getChallengeWebviewContent(result, decisionItem.title);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load decision: ${error.message}`);
        }
    });
}

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
            
            // Show response in a webview panel
            const panel = vscode.window.createWebviewPanel(
                'supymemResponse',
                'Supymem Response',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            panel.webview.html = getWebviewContent(query, response.response, response.sources);
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
                    panel.webview.html = getWebviewContent(query, response.response, null);
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

function getWebviewContent(query: string, response: string, sources: any[] | null): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
            line-height: 1.6;
        }
        h2 { 
            color: var(--vscode-textLink-foreground); 
            margin-bottom: 10px; 
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .query { 
            padding: 12px; 
            background: var(--vscode-textBlockQuote-background); 
            border-left: 3px solid var(--vscode-textLink-foreground); 
            margin-bottom: 20px; 
            border-radius: 4px;
        }
        .response { 
            line-height: 1.8; 
            white-space: pre-wrap;
        }
        .sources { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid var(--vscode-panel-border); 
        }
        .source { 
            padding: 8px 12px; 
            background: var(--vscode-textBlockQuote-background); 
            margin: 8px 0; 
            border-radius: 4px; 
            font-size: 12px; 
        }
        .source-type {
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
        }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h2>🧠 Supymem Response</h2>
    <div class="query"><strong>Q:</strong> ${escapeHtml(query)}</div>
    <div class="response">${formatMarkdown(response)}</div>
    ${sources && sources.length > 0 ? `
    <div class="sources">
        <strong>📚 Sources:</strong>
        ${sources.map((s: any) => `
            <div class="source">
                <span class="source-type">[${escapeHtml(s.source || 'unknown')}]</span> 
                ${escapeHtml((s.content || '').slice(0, 150))}...
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
}

function getChallengeWebviewContent(result: any, title?: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            background: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
            line-height: 1.6;
        }
        h2 { 
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        h3 { 
            color: var(--vscode-symbolIcon-functionForeground); 
            margin-top: 20px; 
        }
        .decision { 
            padding: 15px; 
            background: var(--vscode-textBlockQuote-background); 
            border-radius: 4px; 
            margin: 10px 0; 
        }
        .analysis { 
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .alternatives { 
            margin-top: 20px; 
            padding: 15px; 
            background: var(--vscode-inputValidation-warningBackground); 
            border-left: 3px solid var(--vscode-inputValidation-warningBorder); 
            border-radius: 4px;
        }
        .alternatives ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
        }
        .confidence { 
            font-size: 12px; 
            color: var(--vscode-descriptionForeground); 
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .meta { 
            font-size: 12px; 
            color: var(--vscode-descriptionForeground); 
        }
    </style>
</head>
<body>
    ${result.decision ? `
    <h2>📋 ${escapeHtml(title || result.decision.title || 'Decision')}</h2>
    <div class="decision">
        <p class="meta"><strong>Decided by:</strong> ${escapeHtml(result.decision.decided_by || 'Unknown')}</p>
        ${result.original_reasoning ? `<p><strong>Original reasoning:</strong> ${escapeHtml(result.original_reasoning)}</p>` : ''}
    </div>
    ` : `<h2>🔍 ${escapeHtml(title || 'Analysis')}</h2>`}
    
    <h3>Analysis</h3>
    <div class="analysis">${formatMarkdown(result.ai_analysis || result.response || 'No analysis available.')}</div>
    
    ${result.suggested_alternatives && result.suggested_alternatives.length > 0 ? `
    <div class="alternatives">
        <strong>💡 Suggested Alternatives:</strong>
        <ul>
            ${result.suggested_alternatives.map((a: string) => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
    
    ${result.related_discussions && result.related_discussions.length > 0 ? `
    <h3>📝 Related Discussions</h3>
    ${result.related_discussions.map((d: any) => `
        <div class="decision">
            <strong>${escapeHtml(d.source || 'Source')}</strong>: ${escapeHtml((d.content || '').slice(0, 200))}...
        </div>
    `).join('')}
    ` : ''}
    
    <p class="confidence">
        ${result.confidence ? `Confidence: ${(result.confidence * 100).toFixed(0)}%` : ''}
    </p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMarkdown(text: string): string {
    if (!text) return '';
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background: var(--vscode-textBlockQuote-background); padding: 2px 6px; border-radius: 3px;">$1</code>')
        .replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>')
        .replace(/### (.*?)(<br>|$)/g, '<h4>$1</h4>')
        .replace(/- (.*?)(<br>|$)/g, '• $1<br>');
}

export function deactivate() {
    console.log('Supymem extension deactivated');
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
