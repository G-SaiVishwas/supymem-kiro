import * as vscode from 'vscode';
import { SupymemAPI, IntentData, Constraint, DecisionSummary } from '../api';

export class IntentPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'supymem.intentPanel';

    private _view?: vscode.WebviewView;
    private _api: SupymemAPI;
    private _currentFilePath?: string;
    private _intentData?: IntentData;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        api: SupymemAPI
    ) {
        this._api = api;
    }

    public updateApi(api: SupymemAPI): void {
        this._api = api;
        this.refresh();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getLoadingHtml();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'viewDecision':
                    vscode.commands.executeCommand('supymem.viewDecision', data.decisionId);
                    break;
                case 'askQuestion':
                    vscode.commands.executeCommand('supymem.askAgent');
                    break;
                case 'viewConstraint':
                    this._showConstraintDetail(data.constraintId);
                    break;
                case 'contactExpert':
                    vscode.window.showInformationMessage(`Contact @${data.username} for help with this file`);
                    break;
                case 'refresh':
                    this.refresh();
                    break;
            }
        });

        // Listen for active editor changes
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this._updateForFile(editor.document.uri.fsPath);
            }
        });

        // Initial load
        if (vscode.window.activeTextEditor) {
            this._updateForFile(vscode.window.activeTextEditor.document.uri.fsPath);
        } else {
            this._showWelcome();
        }
    }

    public async refresh(): Promise<void> {
        if (this._currentFilePath) {
            await this._updateForFile(this._currentFilePath, true);
        }
    }

    private async _updateForFile(filePath: string, forceRefresh = false): Promise<void> {
        if (!this._view) {
            return;
        }

        if (filePath === this._currentFilePath && !forceRefresh) {
            return;
        }

        this._currentFilePath = filePath;
        this._view.webview.html = this._getLoadingHtml();

        try {
            this._intentData = await this._api.getFileIntent(filePath);
            this._view.webview.html = this._getHtmlForIntent(this._intentData);
        } catch (error: any) {
            this._view.webview.html = this._getErrorHtml(error.message);
        }
    }

    private _showWelcome(): void {
        if (!this._view) {
            return;
        }
        this._view.webview.html = this._getWelcomeHtml();
    }

    private async _showConstraintDetail(constraintId: string): Promise<void> {
        const constraint = this._intentData?.constraints.find(c => c.id === constraintId);
        if (!constraint) {
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'supymemConstraint',
            `Constraint: ${constraint.type}`,
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        );

        panel.webview.html = this._getConstraintDetailHtml(constraint);
    }

    private _getLoadingHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getBaseStyles()}
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--vscode-descriptionForeground);
        }
        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--vscode-editor-background);
            border-top: 3px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <div>Analyzing file intent...</div>
    </div>
</body>
</html>`;
    }

    private _getWelcomeHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getBaseStyles()}
        .welcome {
            padding: 20px;
            text-align: center;
        }
        .welcome-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .welcome-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }
        .welcome-text {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="welcome">
        <div class="welcome-icon">🎯</div>
        <div class="welcome-title">Intent Panel</div>
        <div class="welcome-text">
            Open a file to see its purpose, constraints, and related decisions.
        </div>
    </div>
</body>
</html>`;
    }

    private _getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getBaseStyles()}
        .error {
            padding: 20px;
            text-align: center;
        }
        .error-icon {
            font-size: 32px;
            margin-bottom: 12px;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 13px;
        }
        .retry-btn {
            margin-top: 16px;
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .retry-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${this._escapeHtml(message)}</div>
        <button class="retry-btn" onclick="vscode.postMessage({type: 'refresh'})">Retry</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private _getHtmlForIntent(data: IntentData): string {
        const fileName = data.file_path.split(/[/\\]/).pop() || 'Unknown';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getBaseStyles()}
        ${this._getIntentStyles()}
    </style>
</head>
<body>
    <div class="intent-panel">
        <!-- Header -->
        <div class="header">
            <div class="file-info">
                <span class="file-icon">📄</span>
                <span class="file-name" title="${this._escapeHtml(data.file_path)}">${this._escapeHtml(fileName)}</span>
            </div>
            <button class="refresh-btn" onclick="vscode.postMessage({type: 'refresh'})" title="Refresh">↻</button>
        </div>

        <!-- Purpose Section -->
        <div class="section">
            <div class="section-header">
                <span class="section-icon">🎯</span>
                <span class="section-title">PURPOSE</span>
            </div>
            <div class="purpose-text">${this._escapeHtml(data.purpose)}</div>
            ${data.context ? `<div class="context-text">${this._escapeHtml(data.context)}</div>` : ''}
        </div>

        <!-- Active Constraints -->
        <div class="section">
            <div class="section-header">
                <span class="section-icon">⚡</span>
                <span class="section-title">ACTIVE CONSTRAINTS</span>
            </div>
            <div class="constraints-list">
                ${data.constraints.map(c => this._renderConstraint(c)).join('')}
            </div>
        </div>

        <!-- Open Questions -->
        ${data.open_questions.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">❓</span>
                <span class="section-title">OPEN QUESTIONS</span>
            </div>
            <ul class="questions-list">
                ${data.open_questions.map(q => `<li>${this._escapeHtml(q)}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <!-- Recent Changes -->
        ${data.recent_changes.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">📝</span>
                <span class="section-title">RECENT CHANGES</span>
            </div>
            <div class="changes-list">
                ${data.recent_changes.slice(0, 5).map(c => `
                    <div class="change-item">
                        <span class="change-date">${this._escapeHtml(c.date)}</span>
                        <span class="change-desc">${this._escapeHtml(c.description)}</span>
                        <span class="change-author">@${this._escapeHtml(c.author)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Experts -->
        ${data.experts.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">👤</span>
                <span class="section-title">EXPERTS</span>
            </div>
            <div class="experts-list">
                ${data.experts.map(e => `
                    <div class="expert-item" onclick="vscode.postMessage({type: 'contactExpert', username: '${this._escapeHtml(e.username)}'})">
                        <span class="expert-name">@${this._escapeHtml(e.username)}</span>
                        <span class="expert-score">${Math.round(e.ownership_score * 100)}%</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Related Decisions -->
        ${data.related_decisions.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">📋</span>
                <span class="section-title">RELATED DECISIONS</span>
                <span class="section-count">${data.related_decisions.length}</span>
            </div>
            <div class="decisions-list">
                ${data.related_decisions.map(d => this._renderDecision(d)).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Actions -->
        <div class="actions">
            <button class="action-btn" onclick="vscode.postMessage({type: 'askQuestion'})">
                💬 Ask a Question
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private _renderConstraint(constraint: Constraint): string {
        const severityIcons: Record<string, string> = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        const typeIcons: Record<string, string> = {
            security: '🔒',
            performance: '⚡',
            cost: '💰',
            reliability: '🛡️'
        };

        return `
            <div class="constraint-item" onclick="vscode.postMessage({type: 'viewConstraint', constraintId: '${constraint.id}'})">
                <div class="constraint-header">
                    <span class="constraint-severity">${severityIcons[constraint.severity] || '⚪'}</span>
                    <span class="constraint-type">${typeIcons[constraint.type] || '📌'} ${this._escapeHtml(constraint.type)}</span>
                </div>
                <div class="constraint-desc">${this._escapeHtml(constraint.description)}</div>
            </div>
        `;
    }

    private _renderDecision(decision: DecisionSummary): string {
        const importanceIcons: Record<string, string> = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        return `
            <div class="decision-item" onclick="vscode.postMessage({type: 'viewDecision', decisionId: '${decision.id}'})">
                <div class="decision-header">
                    <span class="decision-importance">${importanceIcons[decision.importance || 'medium']}</span>
                    <span class="decision-title">${this._escapeHtml(decision.title)}</span>
                </div>
                ${decision.summary ? `<div class="decision-summary">${this._escapeHtml(decision.summary)}</div>` : ''}
                <div class="decision-meta">
                    ${decision.category ? `<span class="decision-category">${this._escapeHtml(decision.category)}</span>` : ''}
                    ${decision.decided_by ? `<span class="decision-author">@${this._escapeHtml(decision.decided_by)}</span>` : ''}
                </div>
            </div>
        `;
    }

    private _getConstraintDetailHtml(constraint: Constraint): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getBaseStyles()}
        .constraint-detail {
            padding: 20px;
        }
        .constraint-detail h2 {
            margin: 0 0 20px 0;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
        }
        .detail-label {
            font-weight: 600;
            width: 120px;
            color: var(--vscode-descriptionForeground);
        }
        .detail-value {
            color: var(--vscode-foreground);
        }
        .severity-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .severity-critical { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        .severity-high { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
        .severity-medium { background: rgba(255, 204, 0, 0.2); color: #ccaa00; }
        .severity-low { background: rgba(68, 187, 68, 0.2); color: #44bb44; }
        .threshold-box {
            background: var(--vscode-textBlockQuote-background);
            padding: 12px;
            border-radius: 4px;
            font-family: monospace;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="constraint-detail">
        <h2>
            ${constraint.type === 'security' ? '🔒' : constraint.type === 'performance' ? '⚡' : constraint.type === 'cost' ? '💰' : '📌'}
            ${this._escapeHtml(constraint.type.charAt(0).toUpperCase() + constraint.type.slice(1))} Constraint
        </h2>
        
        <div class="detail-row">
            <span class="detail-label">Description:</span>
            <span class="detail-value">${this._escapeHtml(constraint.description)}</span>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Severity:</span>
            <span class="detail-value">
                <span class="severity-badge severity-${constraint.severity}">${constraint.severity.toUpperCase()}</span>
            </span>
        </div>
        
        ${constraint.approved_by ? `
        <div class="detail-row">
            <span class="detail-label">Approved by:</span>
            <span class="detail-value">@${this._escapeHtml(constraint.approved_by)}</span>
        </div>
        ` : ''}
        
        ${constraint.approved_at ? `
        <div class="detail-row">
            <span class="detail-label">Approved at:</span>
            <span class="detail-value">${this._escapeHtml(constraint.approved_at)}</span>
        </div>
        ` : ''}
        
        ${constraint.threshold ? `
        <div class="detail-row">
            <span class="detail-label">Threshold:</span>
        </div>
        <div class="threshold-box">
            ${JSON.stringify(constraint.threshold, null, 2)}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
    }

    private _getBaseStyles(): string {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background: var(--vscode-sideBar-background);
                line-height: 1.5;
            }
            button {
                font-family: inherit;
            }
        `;
    }

    private _getIntentStyles(): string {
        return `
            .intent-panel {
                padding: 12px;
            }
            
            /* Header */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--vscode-panel-border);
                margin-bottom: 12px;
            }
            .file-info {
                display: flex;
                align-items: center;
                gap: 8px;
                overflow: hidden;
            }
            .file-icon {
                flex-shrink: 0;
            }
            .file-name {
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .refresh-btn {
                background: none;
                border: none;
                color: var(--vscode-foreground);
                cursor: pointer;
                font-size: 16px;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .refresh-btn:hover {
                background: var(--vscode-toolbar-hoverBackground);
            }
            
            /* Sections */
            .section {
                margin-bottom: 16px;
            }
            .section-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }
            .section-icon {
                font-size: 14px;
            }
            .section-title {
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.5px;
                color: var(--vscode-descriptionForeground);
            }
            .section-count {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                font-size: 10px;
                padding: 1px 6px;
                border-radius: 10px;
                margin-left: auto;
            }
            
            /* Purpose */
            .purpose-text {
                color: var(--vscode-foreground);
                font-size: 13px;
                line-height: 1.5;
            }
            .context-text {
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
                margin-top: 6px;
                font-style: italic;
            }
            
            /* Constraints */
            .constraints-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .constraint-item {
                background: var(--vscode-editor-background);
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .constraint-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .constraint-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 4px;
            }
            .constraint-severity {
                font-size: 12px;
            }
            .constraint-type {
                font-size: 11px;
                font-weight: 600;
                text-transform: capitalize;
                color: var(--vscode-textLink-foreground);
            }
            .constraint-desc {
                font-size: 12px;
                color: var(--vscode-foreground);
            }
            
            /* Questions */
            .questions-list {
                list-style: none;
                padding-left: 0;
            }
            .questions-list li {
                padding: 6px 0;
                padding-left: 16px;
                position: relative;
                font-size: 12px;
                color: var(--vscode-foreground);
            }
            .questions-list li::before {
                content: '•';
                position: absolute;
                left: 0;
                color: var(--vscode-descriptionForeground);
            }
            
            /* Changes */
            .changes-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .change-item {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 12px;
                padding: 4px 0;
            }
            .change-date {
                color: var(--vscode-descriptionForeground);
                font-size: 11px;
            }
            .change-desc {
                color: var(--vscode-foreground);
                flex: 1;
            }
            .change-author {
                color: var(--vscode-textLink-foreground);
                font-size: 11px;
            }
            
            /* Experts */
            .experts-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .expert-item {
                display: flex;
                align-items: center;
                gap: 6px;
                background: var(--vscode-editor-background);
                padding: 6px 10px;
                border-radius: 16px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .expert-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .expert-name {
                font-size: 12px;
                color: var(--vscode-textLink-foreground);
            }
            .expert-score {
                font-size: 10px;
                color: var(--vscode-descriptionForeground);
                background: var(--vscode-badge-background);
                padding: 1px 6px;
                border-radius: 8px;
            }
            
            /* Decisions */
            .decisions-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .decision-item {
                background: var(--vscode-editor-background);
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .decision-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .decision-header {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                margin-bottom: 4px;
            }
            .decision-importance {
                font-size: 12px;
                flex-shrink: 0;
            }
            .decision-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--vscode-foreground);
            }
            .decision-summary {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 6px;
            }
            .decision-meta {
                display: flex;
                gap: 12px;
                font-size: 10px;
            }
            .decision-category {
                color: var(--vscode-textLink-foreground);
                background: var(--vscode-textBlockQuote-background);
                padding: 1px 6px;
                border-radius: 4px;
            }
            .decision-author {
                color: var(--vscode-descriptionForeground);
            }
            
            /* Actions */
            .actions {
                margin-top: 16px;
                padding-top: 12px;
                border-top: 1px solid var(--vscode-panel-border);
            }
            .action-btn {
                width: 100%;
                padding: 10px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: background 0.15s;
            }
            .action-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
        `;
    }

    private _escapeHtml(text: string): string {
        if (!text) {return '';}
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

