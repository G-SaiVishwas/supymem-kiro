import * as vscode from 'vscode';
import { SupymemAPI, DecisionDetail } from '../api';

export class DecisionTracePanel {
    public static currentPanel: DecisionTracePanel | undefined;
    public static readonly viewType = 'supymemDecisionTrace';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _api: SupymemAPI;
    private _disposables: vscode.Disposable[] = [];

    public static async createOrShow(
        extensionUri: vscode.Uri,
        api: SupymemAPI,
        filePath?: string
    ) {
        const column = vscode.ViewColumn.Beside;

        if (DecisionTracePanel.currentPanel) {
            DecisionTracePanel.currentPanel._panel.reveal(column);
            if (filePath) {
                await DecisionTracePanel.currentPanel._loadTrace(filePath);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            DecisionTracePanel.viewType,
            'Decision Trace',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        DecisionTracePanel.currentPanel = new DecisionTracePanel(panel, extensionUri, api);
        
        if (filePath) {
            await DecisionTracePanel.currentPanel._loadTrace(filePath);
        } else if (vscode.window.activeTextEditor) {
            await DecisionTracePanel.currentPanel._loadTrace(
                vscode.window.activeTextEditor.document.uri.fsPath
            );
        }
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        api: SupymemAPI
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._api = api;

        this._panel.webview.html = this._getLoadingHtml();

        // Handle messages
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'viewDecision':
                        await this._showDecisionDetail(message.decisionId);
                        break;
                    case 'challenge':
                        await this._challengeDecision(message.decisionId, message.question);
                        break;
                    case 'refresh':
                        if (message.filePath) {
                            await this._loadTrace(message.filePath);
                        }
                        break;
                }
            },
            null,
            this._disposables
        );

        // Dispose
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        DecisionTracePanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private async _loadTrace(filePath: string) {
        this._panel.webview.html = this._getLoadingHtml();

        try {
            const decisions = await this._api.getDecisionTrace(filePath);
            this._panel.webview.html = this._getTraceHtml(filePath, decisions);
        } catch (error: any) {
            this._panel.webview.html = this._getErrorHtml(error.message);
        }
    }

    private async _showDecisionDetail(decisionId: string) {
        try {
            const decision = await this._api.getDecision(decisionId);
            const result = await this._api.challengeDecision(
                `Explain this decision in detail: "${decision.title}"`,
                decisionId
            );
            
            // Show in a new panel
            const panel = vscode.window.createWebviewPanel(
                'supymemDecisionDetail',
                `Decision: ${decision.title}`,
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );
            
            panel.webview.html = this._getDecisionDetailHtml(decision, result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load decision: ${error.message}`);
        }
    }

    private async _challengeDecision(decisionId: string, question: string) {
        try {
            const result = await this._api.challengeDecision(question, decisionId);
            
            const panel = vscode.window.createWebviewPanel(
                'supymemChallenge',
                'Decision Challenge',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );
            
            panel.webview.html = this._getChallengeResultHtml(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to challenge decision: ${error.message}`);
        }
    }

    private _getLoadingHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--vscode-editor-background);
            border-top: 4px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
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
        <div>Loading decision trace...</div>
    </div>
</body>
</html>`;
    }

    private _getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 40px;
            text-align: center;
        }
        .error {
            color: var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <h2>⚠️ Error</h2>
    <p class="error">${this._escapeHtml(message)}</p>
</body>
</html>`;
    }

    private _getTraceHtml(filePath: string, decisions: DecisionDetail[]): string {
        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getStyles()}
    </style>
</head>
<body>
    <div class="trace-container">
        <div class="header">
            <h1>📜 Decision Trace</h1>
            <div class="file-path">${this._escapeHtml(fileName)}</div>
        </div>

        ${decisions.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No decisions recorded</h3>
                <p>No decisions have been recorded for this file yet.</p>
            </div>
        ` : `
            <div class="timeline">
                ${decisions.map((d, i) => this._renderTimelineItem(d, i === 0)).join('')}
            </div>
        `}

        <div class="legend">
            <h4>Legend</h4>
            <div class="legend-items">
                <span class="legend-item"><span class="dot critical"></span> Critical</span>
                <span class="legend-item"><span class="dot high"></span> High</span>
                <span class="legend-item"><span class="dot medium"></span> Medium</span>
                <span class="legend-item"><span class="dot low"></span> Low</span>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function viewDecision(id) {
            vscode.postMessage({ type: 'viewDecision', decisionId: id });
        }
        
        function challengeDecision(id) {
            const question = prompt('What would you like to ask about this decision?');
            if (question) {
                vscode.postMessage({ type: 'challenge', decisionId: id, question });
            }
        }
    </script>
</body>
</html>`;
    }

    private _renderTimelineItem(decision: DecisionDetail, isFirst: boolean): string {
        const importanceClass = decision.importance || 'medium';
        const date = decision.created_at ? new Date(decision.created_at).toLocaleDateString() : 'Unknown';
        
        const categoryIcons: Record<string, string> = {
            architecture: '🏗️',
            technology: '⚙️',
            process: '📋',
            design: '🎨',
            security: '🔒',
            performance: '⚡'
        };

        return `
            <div class="timeline-item ${isFirst ? 'current' : ''}">
                <div class="timeline-line">
                    <div class="timeline-dot ${importanceClass}"></div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-icon">${categoryIcons[decision.category || ''] || '📋'}</span>
                        <span class="timeline-title">${this._escapeHtml(decision.title)}</span>
                        <span class="timeline-date">${date}</span>
                    </div>
                    
                    ${decision.summary ? `
                        <div class="timeline-summary">${this._escapeHtml(decision.summary)}</div>
                    ` : ''}
                    
                    ${decision.reasoning ? `
                        <div class="timeline-reasoning">
                            <strong>Reasoning:</strong> ${this._escapeHtml(decision.reasoning.slice(0, 200))}...
                        </div>
                    ` : ''}
                    
                    <div class="timeline-meta">
                        ${decision.category ? `<span class="badge category">${this._escapeHtml(decision.category)}</span>` : ''}
                        ${decision.decided_by ? `<span class="badge author">@${this._escapeHtml(decision.decided_by)}</span>` : ''}
                        ${decision.alternatives_considered?.length ? `<span class="badge alternatives">${decision.alternatives_considered.length} alternatives</span>` : ''}
                    </div>
                    
                    <div class="timeline-actions">
                        <button onclick="viewDecision('${decision.id}')" class="btn btn-primary">View Details</button>
                        <button onclick="challengeDecision('${decision.id}')" class="btn btn-secondary">Challenge</button>
                    </div>
                </div>
            </div>
        `;
    }

    private _getDecisionDetailHtml(decision: DecisionDetail, challengeResult: any): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${this._getStyles()}
        .decision-detail {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
        }
        .decision-header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .decision-title {
            font-size: 24px;
            margin: 0 0 12px 0;
            color: var(--vscode-foreground);
        }
        .decision-meta {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        .section {
            margin-bottom: 24px;
        }
        .section h3 {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-textLink-foreground);
            margin: 0 0 12px 0;
        }
        .section-content {
            background: var(--vscode-textBlockQuote-background);
            padding: 16px;
            border-radius: 8px;
            line-height: 1.6;
        }
        .alternatives-list {
            list-style: none;
            padding: 0;
        }
        .alternative-item {
            background: var(--vscode-editor-background);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .alternative-name {
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .alternative-reason {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        .analysis {
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="decision-detail">
        <div class="decision-header">
            <h1 class="decision-title">${this._escapeHtml(decision.title)}</h1>
            <div class="decision-meta">
                ${decision.category ? `<span>📁 ${this._escapeHtml(decision.category)}</span>` : ''}
                ${decision.decided_by ? `<span>👤 @${this._escapeHtml(decision.decided_by)}</span>` : ''}
                ${decision.created_at ? `<span>📅 ${new Date(decision.created_at).toLocaleDateString()}</span>` : ''}
                ${decision.importance ? `<span>⚡ ${this._escapeHtml(decision.importance)}</span>` : ''}
            </div>
        </div>

        ${decision.summary ? `
        <div class="section">
            <h3>📝 Summary</h3>
            <div class="section-content">${this._escapeHtml(decision.summary)}</div>
        </div>
        ` : ''}

        ${decision.reasoning ? `
        <div class="section">
            <h3>💡 Reasoning</h3>
            <div class="section-content">${this._escapeHtml(decision.reasoning)}</div>
        </div>
        ` : ''}

        ${decision.alternatives_considered?.length ? `
        <div class="section">
            <h3>🔀 Alternatives Considered</h3>
            <ul class="alternatives-list">
                ${decision.alternatives_considered.map(alt => `
                    <li class="alternative-item">
                        <div class="alternative-name">${this._escapeHtml(alt.option)}</div>
                        ${alt.rejected_reason ? `<div class="alternative-reason">❌ ${this._escapeHtml(alt.rejected_reason)}</div>` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        ${challengeResult.ai_analysis ? `
        <div class="section">
            <h3>🤖 AI Analysis</h3>
            <div class="section-content analysis">${this._formatMarkdown(challengeResult.ai_analysis)}</div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
    }

    private _getChallengeResultHtml(result: any): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        ${this._getStyles()}
        .challenge-result {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
        }
        .result-header {
            margin-bottom: 24px;
        }
        .confidence {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .analysis {
            background: var(--vscode-textBlockQuote-background);
            padding: 20px;
            border-radius: 8px;
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .suggestions {
            margin-top: 24px;
        }
        .suggestion-item {
            background: var(--vscode-editor-background);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
    <div class="challenge-result">
        <div class="result-header">
            <h1>🔍 Challenge Analysis</h1>
            <p class="confidence">Confidence: ${Math.round((result.confidence || 0) * 100)}%</p>
        </div>

        <div class="analysis">${this._formatMarkdown(result.ai_analysis || 'No analysis available.')}</div>

        ${result.suggested_alternatives?.length ? `
        <div class="suggestions">
            <h3>💡 Suggested Alternatives</h3>
            ${result.suggested_alternatives.map((s: string) => `
                <div class="suggestion-item">${this._escapeHtml(s)}</div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
    }

    private _getStyles(): string {
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
                background: var(--vscode-editor-background);
                line-height: 1.5;
            }
            
            .trace-container {
                padding: 24px;
                max-width: 900px;
                margin: 0 auto;
            }
            
            .header {
                margin-bottom: 32px;
            }
            .header h1 {
                font-size: 24px;
                margin: 0 0 8px 0;
                color: var(--vscode-foreground);
            }
            .file-path {
                font-size: 13px;
                color: var(--vscode-descriptionForeground);
            }
            
            .empty-state {
                text-align: center;
                padding: 60px 20px;
            }
            .empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            .empty-state h3 {
                color: var(--vscode-foreground);
                margin-bottom: 8px;
            }
            .empty-state p {
                color: var(--vscode-descriptionForeground);
            }
            
            /* Timeline */
            .timeline {
                position: relative;
            }
            .timeline-item {
                display: flex;
                gap: 20px;
                margin-bottom: 24px;
            }
            .timeline-line {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 24px;
            }
            .timeline-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--vscode-badge-background);
                flex-shrink: 0;
            }
            .timeline-dot.critical { background: #ff4444; }
            .timeline-dot.high { background: #ff8800; }
            .timeline-dot.medium { background: #ffcc00; }
            .timeline-dot.low { background: #44bb44; }
            
            .timeline-item::after {
                content: '';
                position: absolute;
                left: 31px;
                top: 24px;
                width: 2px;
                height: calc(100% - 24px);
                background: var(--vscode-panel-border);
                z-index: -1;
            }
            .timeline-item:last-child::after {
                display: none;
            }
            
            .timeline-content {
                flex: 1;
                background: var(--vscode-textBlockQuote-background);
                padding: 16px;
                border-radius: 8px;
            }
            .timeline-item.current .timeline-content {
                border: 2px solid var(--vscode-textLink-foreground);
            }
            
            .timeline-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            .timeline-icon {
                font-size: 18px;
            }
            .timeline-title {
                font-weight: 600;
                font-size: 14px;
                flex: 1;
            }
            .timeline-date {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            
            .timeline-summary {
                font-size: 13px;
                color: var(--vscode-foreground);
                margin-bottom: 8px;
            }
            .timeline-reasoning {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 12px;
                padding: 8px;
                background: var(--vscode-editor-background);
                border-radius: 4px;
            }
            
            .timeline-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 12px;
            }
            .badge {
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 12px;
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
            }
            .badge.category {
                background: var(--vscode-textLink-foreground);
                color: white;
            }
            .badge.author {
                background: var(--vscode-editor-background);
                color: var(--vscode-textLink-foreground);
            }
            .badge.alternatives {
                background: var(--vscode-inputValidation-warningBackground);
                color: var(--vscode-foreground);
            }
            
            .timeline-actions {
                display: flex;
                gap: 8px;
            }
            
            .btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .btn-primary {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .btn-primary:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .btn-secondary {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .btn-secondary:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            
            /* Legend */
            .legend {
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid var(--vscode-panel-border);
            }
            .legend h4 {
                font-size: 11px;
                text-transform: uppercase;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 8px;
            }
            .legend-items {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }
            .dot.critical { background: #ff4444; }
            .dot.high { background: #ff8800; }
            .dot.medium { background: #ffcc00; }
            .dot.low { background: #44bb44; }
        `;
    }

    private _escapeHtml(text: string): string {
        if (!text) {return '';}
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private _formatMarkdown(text: string): string {
        if (!text) {return '';}
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code style="background: var(--vscode-textBlockQuote-background); padding: 2px 6px; border-radius: 3px;">$1</code>')
            .replace(/## (.*?)(<br>|$)/g, '<h3 style="margin-top: 16px; color: var(--vscode-textLink-foreground);">$1</h3>')
            .replace(/### (.*?)(<br>|$)/g, '<h4 style="margin-top: 12px;">$1</h4>')
            .replace(/- (.*?)(<br>|$)/g, '• $1<br>');
    }
}

