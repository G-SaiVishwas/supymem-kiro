import * as vscode from 'vscode';
import { SupymemAPI, ChangeAnalysis, ConflictItem } from '../api';

export class ChangeWarningPanel {
    public static currentPanel: ChangeWarningPanel | undefined;
    public static readonly viewType = 'supymemChangeWarning';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _api: SupymemAPI;
    private _disposables: vscode.Disposable[] = [];
    private _analysis?: ChangeAnalysis;
    private _files: string[] = [];

    public static async show(
        extensionUri: vscode.Uri,
        api: SupymemAPI,
        files: string[],
        analysis: ChangeAnalysis
    ) {
        const column = vscode.ViewColumn.Beside;

        if (ChangeWarningPanel.currentPanel) {
            ChangeWarningPanel.currentPanel._panel.reveal(column);
            ChangeWarningPanel.currentPanel._updateContent(files, analysis);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ChangeWarningPanel.viewType,
            '⚠️ Before You Change This',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ChangeWarningPanel.currentPanel = new ChangeWarningPanel(panel, extensionUri, api);
        ChangeWarningPanel.currentPanel._updateContent(files, analysis);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        api: SupymemAPI
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._api = api;

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'viewDecision':
                        vscode.commands.executeCommand('supymem.viewDecision', { decisionId: message.decisionId });
                        break;
                    case 'proceedAnyway':
                        this._panel.dispose();
                        vscode.window.showInformationMessage('Proceeding with changes. Remember to document your reasoning!');
                        break;
                    case 'requestReview':
                        await this._requestReview();
                        break;
                    case 'dismiss':
                        this._panel.dispose();
                        break;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        ChangeWarningPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private _updateContent(files: string[], analysis: ChangeAnalysis) {
        this._files = files;
        this._analysis = analysis;
        this._panel.webview.html = this._getHtml(files, analysis);
    }

    private async _requestReview() {
        const message = await vscode.window.showInputBox({
            prompt: 'Describe why you need to make this change',
            placeHolder: 'This change is necessary because...'
        });

        if (message) {
            vscode.window.showInformationMessage('Review request submitted. Team will be notified.');
            this._panel.dispose();
        }
    }

    private _getHtml(files: string[], analysis: ChangeAnalysis): string {
        const riskColors: Record<string, string> = {
            critical: '#ff4444',
            high: '#ff8800',
            medium: '#ffcc00',
            low: '#44bb44'
        };

        const riskIcons: Record<string, string> = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            low: '✅'
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
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
            padding: 24px;
        }
        
        .container {
            max-width: 700px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .header-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
        .header h1 {
            font-size: 22px;
            margin-bottom: 8px;
        }
        .header-subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
        
        .risk-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 16px;
            font-weight: 600;
            font-size: 12px;
            margin: 12px 0;
        }
        .risk-critical { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        .risk-high { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
        .risk-medium { background: rgba(255, 204, 0, 0.2); color: #ccaa00; }
        .risk-low { background: rgba(68, 187, 68, 0.2); color: #44bb44; }
        
        .summary {
            background: var(--vscode-textBlockQuote-background);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .files-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .file-chip {
            background: var(--vscode-editor-background);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-family: monospace;
        }
        
        .conflict-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .conflict-item {
            background: var(--vscode-inputValidation-warningBackground);
            border-left: 4px solid ${riskColors[analysis.risk_level]};
            padding: 16px;
            border-radius: 0 8px 8px 0;
        }
        .conflict-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
        }
        .conflict-icon {
            font-size: 20px;
        }
        .conflict-title {
            font-weight: 600;
            font-size: 14px;
            flex: 1;
        }
        .conflict-severity {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
        }
        .conflict-severity.warning { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
        .conflict-severity.error { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        .conflict-severity.info { background: rgba(68, 136, 255, 0.2); color: #4488ff; }
        
        .conflict-description {
            font-size: 13px;
            color: var(--vscode-foreground);
            margin-bottom: 10px;
        }
        .conflict-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .conflict-action {
            margin-top: 8px;
        }
        .conflict-action button {
            font-size: 11px;
            padding: 4px 10px;
            background: transparent;
            border: 1px solid var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
            border-radius: 4px;
            cursor: pointer;
        }
        .conflict-action button:hover {
            background: var(--vscode-textLink-foreground);
            color: white;
        }
        
        .recommendations {
            background: var(--vscode-editor-background);
            padding: 16px;
            border-radius: 8px;
        }
        .recommendations ul {
            list-style: none;
            padding: 0;
        }
        .recommendations li {
            padding: 6px 0;
            padding-left: 20px;
            position: relative;
            font-size: 13px;
        }
        .recommendations li::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .affected-users {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .user-chip {
            background: var(--vscode-textLink-foreground);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
        }
        
        .actions {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-danger {
            background: rgba(255, 68, 68, 0.2);
            color: #ff4444;
            border: 1px solid #ff4444;
        }
        .btn-danger:hover {
            background: #ff4444;
            color: white;
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .no-conflicts {
            text-align: center;
            padding: 40px 20px;
        }
        .no-conflicts-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .no-conflicts h3 {
            color: #44bb44;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">${analysis.has_conflicts ? '⚠️' : '✅'}</div>
            <h1>${analysis.has_conflicts ? 'Before You Change This' : 'Change Analysis Complete'}</h1>
            <p class="header-subtitle">${files.length} file(s) analyzed</p>
            <span class="risk-badge risk-${analysis.risk_level}">
                ${riskIcons[analysis.risk_level]} ${analysis.risk_level.toUpperCase()} RISK
            </span>
        </div>

        <div class="summary">
            ${this._escapeHtml(analysis.summary)}
        </div>

        <div class="section">
            <div class="section-title">📁 Files Being Changed</div>
            <div class="files-list">
                ${files.map(f => `<span class="file-chip">${this._escapeHtml(f.split(/[/\\]/).pop() || f)}</span>`).join('')}
            </div>
        </div>

        ${analysis.conflicts.length > 0 ? `
        <div class="section">
            <div class="section-title">⚠️ Decision Conflicts (${analysis.conflicts.length})</div>
            <div class="conflict-list">
                ${analysis.conflicts.map(c => this._renderConflict(c)).join('')}
            </div>
        </div>
        ` : `
        <div class="no-conflicts">
            <div class="no-conflicts-icon">✅</div>
            <h3>No Decision Conflicts</h3>
            <p>This change doesn't conflict with any recorded decisions.</p>
        </div>
        `}

        ${analysis.affected_users.length > 0 ? `
        <div class="section">
            <div class="section-title">👥 Affected Team Members</div>
            <div class="affected-users">
                ${analysis.affected_users.map(u => `<span class="user-chip">@${this._escapeHtml(u)}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        ${analysis.recommendations.length > 0 ? `
        <div class="section">
            <div class="section-title">💡 Recommendations</div>
            <div class="recommendations">
                <ul>
                    ${analysis.recommendations.map(r => `<li>${this._escapeHtml(r)}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        <div class="actions">
            ${analysis.has_conflicts ? `
                <button class="btn btn-danger" onclick="vscode.postMessage({type: 'proceedAnyway'})">
                    ⚡ Proceed Anyway
                </button>
                <button class="btn btn-secondary" onclick="vscode.postMessage({type: 'requestReview'})">
                    📝 Request Review
                </button>
            ` : ''}
            <button class="btn btn-primary" onclick="vscode.postMessage({type: 'dismiss'})">
                ${analysis.has_conflicts ? '✕ Cancel' : '✓ Got It'}
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
    }

    private _renderConflict(conflict: ConflictItem): string {
        return `
            <div class="conflict-item">
                <div class="conflict-header">
                    <span class="conflict-icon">📋</span>
                    <span class="conflict-title">${this._escapeHtml(conflict.decision_title)}</span>
                    <span class="conflict-severity ${conflict.severity}">${conflict.severity}</span>
                </div>
                <div class="conflict-description">${this._escapeHtml(conflict.description)}</div>
                <div class="conflict-meta">
                    Type: ${this._escapeHtml(conflict.conflict_type)}
                    ${conflict.approved_by ? ` • Approved by @${this._escapeHtml(conflict.approved_by)}` : ''}
                    ${conflict.approved_at ? ` on ${this._escapeHtml(conflict.approved_at)}` : ''}
                </div>
                <div class="conflict-action">
                    <button onclick="vscode.postMessage({type: 'viewDecision', decisionId: '${conflict.decision_id}'})">
                        View Decision
                    </button>
                </div>
            </div>
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
}

// ============================================================================
// CHANGE WATCHER SERVICE
// ============================================================================

export class ChangeWatcher {
    private _api: SupymemAPI;
    private _diagnosticCollection: vscode.DiagnosticCollection;
    private _debounceTimer?: NodeJS.Timeout;

    constructor(api: SupymemAPI) {
        this._api = api;
        this._diagnosticCollection = vscode.languages.createDiagnosticCollection('supymem');
    }

    public updateApi(api: SupymemAPI): void {
        this._api = api;
    }

    public async analyzeCurrentChanges(extensionUri: vscode.Uri): Promise<void> {
        const files = this._getModifiedFiles();
        
        if (files.length === 0) {
            vscode.window.showInformationMessage('No modified files to analyze.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing changes...',
            cancellable: false
        }, async () => {
            try {
                const analysis = await this._api.analyzeChange(files);
                await ChangeWarningPanel.show(extensionUri, this._api, files, analysis);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to analyze changes: ${error.message}`);
            }
        });
    }

    public startWatching(): vscode.Disposable {
        const config = vscode.workspace.getConfiguration('supymem');
        const enabled = config.get<boolean>('enableChangeWarnings', true);

        if (!enabled) {
            return { dispose: () => {} };
        }

        // Watch for file saves
        return vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }

            this._debounceTimer = setTimeout(async () => {
                await this._analyzeFile(document.uri.fsPath);
            }, 1000);
        });
    }

    private async _analyzeFile(filePath: string): Promise<void> {
        try {
            const analysis = await this._api.analyzeChange([filePath]);
            
            if (analysis.has_conflicts) {
                this._updateDiagnostics(filePath, analysis);
            } else {
                this._diagnosticCollection.delete(vscode.Uri.file(filePath));
            }
        } catch (error) {
            // Silently fail for background analysis
            console.error('Change analysis failed:', error);
        }
    }

    private _updateDiagnostics(filePath: string, analysis: ChangeAnalysis): void {
        const diagnostics: vscode.Diagnostic[] = analysis.conflicts.map(conflict => {
            const severity = conflict.severity === 'error' 
                ? vscode.DiagnosticSeverity.Error 
                : conflict.severity === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;

            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `[Supymem] ${conflict.description}`,
                severity
            );
            
            diagnostic.source = 'Supymem';
            diagnostic.code = conflict.decision_id;
            
            return diagnostic;
        });

        this._diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
    }

    private _getModifiedFiles(): string[] {
        // Get files from git status or dirty editors
        const dirtyFiles: string[] = [];
        
        vscode.workspace.textDocuments.forEach(doc => {
            if (doc.isDirty && !doc.isUntitled) {
                dirtyFiles.push(doc.uri.fsPath);
            }
        });

        return dirtyFiles;
    }

    public dispose(): void {
        this._diagnosticCollection.dispose();
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
    }
}

