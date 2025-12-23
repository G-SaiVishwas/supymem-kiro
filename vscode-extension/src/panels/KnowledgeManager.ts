import * as vscode from 'vscode';
import { SupymemAPI, KnowledgeEntry, KnowledgeEntryCreate, KnowledgeStats } from '../api';

/**
 * Knowledge Manager Panel - Full CRUD interface for knowledge entries
 */
export class KnowledgeManagerPanel {
    public static currentPanel: KnowledgeManagerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _api: SupymemAPI;
    private _disposables: vscode.Disposable[] = [];
    private _entries: KnowledgeEntry[] = [];
    private _stats: KnowledgeStats | null = null;
    private _filter: { category?: string; source?: string } = {};

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, api: SupymemAPI) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._api = api;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        this._loadData();
    }

    public static show(extensionUri: vscode.Uri, api: SupymemAPI) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (KnowledgeManagerPanel.currentPanel) {
            KnowledgeManagerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'supymemKnowledgeManager',
            '📚 Knowledge Manager',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        KnowledgeManagerPanel.currentPanel = new KnowledgeManagerPanel(panel, extensionUri, api);
    }

    private async _loadData() {
        try {
            const [entriesResult, stats] = await Promise.all([
                this._api.listKnowledgeEntries(this._filter.category, this._filter.source),
                this._api.getKnowledgeStats()
            ]);
            
            this._entries = entriesResult.entries;
            this._stats = stats;
            this._updateWebview();
        } catch (error) {
            console.error('Failed to load knowledge entries:', error);
            this._updateWebview();
        }
    }

    private async _handleMessage(message: any) {
        switch (message.type) {
            case 'refresh':
                await this._loadData();
                break;

            case 'filter':
                this._filter = { category: message.category, source: message.source };
                await this._loadData();
                break;

            case 'create':
                await this._createEntry(message.entry);
                break;

            case 'update':
                await this._updateEntry(message.id, message.updates);
                break;

            case 'delete':
                await this._deleteEntry(message.id);
                break;

            case 'search':
                await this._searchEntries(message.query);
                break;

            case 'viewEntry':
                this._showEntryDetail(message.id);
                break;

            case 'askQuestion':
                await this._askQuestion(message.query);
                break;
        }
    }

    private async _createEntry(entryData: KnowledgeEntryCreate) {
        try {
            const entry = await this._api.createKnowledgeEntry(entryData);
            vscode.window.showInformationMessage(`Knowledge entry created: ${entry.id}`);
            await this._loadData();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create entry: ${error.message}`);
        }
    }

    private async _updateEntry(id: string, updates: any) {
        try {
            await this._api.updateKnowledgeEntry(id, updates);
            vscode.window.showInformationMessage('Knowledge entry updated');
            await this._loadData();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to update entry: ${error.message}`);
        }
    }

    private async _deleteEntry(id: string) {
        const confirm = await vscode.window.showWarningMessage(
            'Delete this knowledge entry?',
            { modal: true },
            'Delete'
        );
        
        if (confirm === 'Delete') {
            try {
                await this._api.deleteKnowledgeEntry(id);
                vscode.window.showInformationMessage('Knowledge entry deleted');
                await this._loadData();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to delete entry: ${error.message}`);
            }
        }
    }

    private async _searchEntries(query: string) {
        try {
            const results = await this._api.searchKnowledge(query);
            this._panel.webview.postMessage({
                type: 'searchResults',
                results: results.results
            });
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    private _showEntryDetail(id: string) {
        const entry = this._entries.find(e => e.id === id);
        if (entry) {
            this._panel.webview.postMessage({
                type: 'showDetail',
                entry
            });
        }
    }

    private async _askQuestion(query: string) {
        try {
            this._panel.webview.postMessage({ type: 'askingQuestion' });
            const result = await this._api.queryKnowledge(query);
            this._panel.webview.postMessage({
                type: 'questionAnswer',
                query,
                answer: result.response,
                sources: result.sources
            });
        } catch (error: any) {
            this._panel.webview.postMessage({
                type: 'questionError',
                error: error.message
            });
        }
    }

    private _updateWebview() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview(): string {
        const categoryColors: Record<string, string> = {
            'architecture': '#3b82f6',
            'decision': '#8b5cf6',
            'process': '#10b981',
            'task': '#f59e0b',
            'regulatory': '#ef4444',
            'other': '#6b7280'
        };

        const sourceIcons: Record<string, string> = {
            'slack': '💬',
            'github': '🐙',
            'manual': '✏️',
            'api': '🔌',
            'unknown': '📄'
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Manager</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #c9d1d9;
            --text-secondary: #8b949e;
            --border-color: #30363d;
            --accent: #58a6ff;
            --success: #3fb950;
            --warning: #d29922;
            --danger: #f85149;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.5;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .stats {
            display: flex;
            gap: 16px;
        }
        
        .stat {
            background: var(--bg-secondary);
            padding: 12px 16px;
            border-radius: 8px;
            text-align: center;
            min-width: 80px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent);
        }
        
        .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .toolbar {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .search-box {
            flex: 1;
            min-width: 200px;
            display: flex;
            gap: 8px;
        }
        
        .search-box input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 14px;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        button {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: var(--accent);
            color: white;
        }
        
        .btn-primary:hover { opacity: 0.9; }
        
        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        
        .btn-secondary:hover { background: var(--border-color); }
        
        .btn-danger {
            background: var(--danger);
            color: white;
        }
        
        .btn-success {
            background: var(--success);
            color: white;
        }
        
        .filters {
            display: flex;
            gap: 12px;
        }
        
        select {
            padding: 10px 14px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 14px;
            cursor: pointer;
        }
        
        .entries-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .entry-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .entry-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
        }
        
        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        
        .entry-source {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-secondary);
        }
        
        .entry-category {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .entry-content {
            font-size: 14px;
            color: var(--text-primary);
            margin-bottom: 12px;
            line-height: 1.6;
            max-height: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .entry-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 12px;
        }
        
        .tag {
            padding: 3px 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            font-size: 11px;
            color: var(--text-secondary);
        }
        
        .entry-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid var(--border-color);
        }
        
        .entry-meta {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .entry-actions {
            display: flex;
            gap: 8px;
        }
        
        .entry-actions button {
            padding: 6px 10px;
            font-size: 12px;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal.active { display: flex; }
        
        .modal-content {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .modal-header h2 {
            font-size: 20px;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
        }
        
        .form-group textarea {
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 14px;
            min-height: 120px;
            resize: vertical;
        }
        
        .ask-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
        }
        
        .ask-section h3 {
            margin-bottom: 12px;
            font-size: 16px;
        }
        
        .ask-input {
            display: flex;
            gap: 8px;
        }
        
        .ask-input input {
            flex: 1;
            padding: 12px 14px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 14px;
        }
        
        .answer-box {
            margin-top: 16px;
            padding: 16px;
            background: var(--bg-tertiary);
            border-radius: 6px;
            display: none;
        }
        
        .answer-box.active { display: block; }
        
        .answer-box h4 {
            margin-bottom: 8px;
            color: var(--accent);
        }
        
        .answer-content {
            white-space: pre-wrap;
            line-height: 1.7;
        }
        
        .loading {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
        }
        
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--border-color);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
        }
        
        .empty-state h3 {
            margin-bottom: 8px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Knowledge Manager</h1>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${this._stats?.total || 0}</div>
                <div class="stat-label">Total Entries</div>
            </div>
            <div class="stat">
                <div class="stat-value">${Object.keys(this._stats?.by_category || {}).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat">
                <div class="stat-value">${Object.keys(this._stats?.by_source || {}).length}</div>
                <div class="stat-label">Sources</div>
            </div>
        </div>
    </div>
    
    <div class="ask-section">
        <h3>🤖 Ask the Knowledge Base</h3>
        <div class="ask-input">
            <input type="text" id="askInput" placeholder="Ask a question about your codebase..." />
            <button class="btn-primary" onclick="askQuestion()">Ask</button>
        </div>
        <div id="answerBox" class="answer-box">
            <h4>Answer</h4>
            <div id="answerContent" class="answer-content"></div>
        </div>
    </div>
    
    <div class="toolbar">
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search knowledge entries..." />
            <button class="btn-secondary" onclick="searchEntries()">🔍 Search</button>
        </div>
        <div class="filters">
            <select id="categoryFilter" onchange="applyFilters()">
                <option value="">All Categories</option>
                <option value="architecture">Architecture</option>
                <option value="decision">Decision</option>
                <option value="process">Process</option>
                <option value="task">Task</option>
                <option value="regulatory">Regulatory</option>
                <option value="other">Other</option>
            </select>
            <select id="sourceFilter" onchange="applyFilters()">
                <option value="">All Sources</option>
                <option value="slack">Slack</option>
                <option value="github">GitHub</option>
                <option value="manual">Manual</option>
                <option value="api">API</option>
            </select>
        </div>
        <button class="btn-success" onclick="showCreateModal()">➕ Add Entry</button>
        <button class="btn-secondary" onclick="refresh()">🔄 Refresh</button>
    </div>
    
    ${this._entries.length === 0 ? `
        <div class="empty-state">
            <h3>No knowledge entries found</h3>
            <p>Start by adding knowledge or adjusting your filters</p>
        </div>
    ` : `
        <div class="entries-grid">
            ${this._entries.map(entry => `
                <div class="entry-card">
                    <div class="entry-header">
                        <div class="entry-source">
                            ${sourceIcons[entry.source] || sourceIcons['unknown']}
                            ${entry.source}
                        </div>
                        <span class="entry-category" style="background: ${categoryColors[entry.category] || categoryColors['other']}20; color: ${categoryColors[entry.category] || categoryColors['other']}">
                            ${entry.category}
                        </span>
                    </div>
                    <div class="entry-content">${this._escapeHtml(entry.content)}</div>
                    ${entry.tags && entry.tags.length > 0 ? `
                        <div class="entry-tags">
                            ${entry.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="entry-footer">
                        <div class="entry-meta">
                            ${entry.user_id ? `@${entry.user_id} • ` : ''}
                            ${new Date(entry.created_at).toLocaleDateString()}
                        </div>
                        <div class="entry-actions">
                            <button class="btn-secondary" onclick="viewEntry('${entry.id}')">View</button>
                            <button class="btn-danger" onclick="deleteEntry('${entry.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `}
    
    <!-- Create Modal -->
    <div id="createModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>➕ Add Knowledge Entry</h2>
                <button class="close-btn" onclick="closeModal('createModal')">&times;</button>
            </div>
            <form id="createForm" onsubmit="createEntry(event)">
                <div class="form-group">
                    <label>Content *</label>
                    <textarea id="newContent" required placeholder="Enter the knowledge content..."></textarea>
                </div>
                <div class="form-group">
                    <label>Source *</label>
                    <select id="newSource" required>
                        <option value="manual">Manual Entry</option>
                        <option value="slack">Slack</option>
                        <option value="github">GitHub</option>
                        <option value="api">API</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="newCategory">
                        <option value="other">Other</option>
                        <option value="architecture">Architecture</option>
                        <option value="decision">Decision</option>
                        <option value="process">Process</option>
                        <option value="task">Task</option>
                        <option value="regulatory">Regulatory</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tags (comma-separated)</label>
                    <input type="text" id="newTags" placeholder="e.g., auth, security, jwt" />
                </div>
                <button type="submit" class="btn-success" style="width: 100%">Create Entry</button>
            </form>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }
        
        function applyFilters() {
            const category = document.getElementById('categoryFilter').value;
            const source = document.getElementById('sourceFilter').value;
            vscode.postMessage({ type: 'filter', category, source });
        }
        
        function searchEntries() {
            const query = document.getElementById('searchInput').value;
            if (query) {
                vscode.postMessage({ type: 'search', query });
            }
        }
        
        function askQuestion() {
            const query = document.getElementById('askInput').value;
            if (query) {
                document.getElementById('answerBox').classList.add('active');
                document.getElementById('answerContent').innerHTML = '<div class="loading"><div class="spinner"></div> Thinking...</div>';
                vscode.postMessage({ type: 'askQuestion', query });
            }
        }
        
        function showCreateModal() {
            document.getElementById('createModal').classList.add('active');
        }
        
        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }
        
        function createEntry(e) {
            e.preventDefault();
            const content = document.getElementById('newContent').value;
            const source = document.getElementById('newSource').value;
            const category = document.getElementById('newCategory').value;
            const tagsRaw = document.getElementById('newTags').value;
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];
            
            vscode.postMessage({
                type: 'create',
                entry: { content, source, category, tags }
            });
            
            closeModal('createModal');
            document.getElementById('createForm').reset();
        }
        
        function viewEntry(id) {
            vscode.postMessage({ type: 'viewEntry', id });
        }
        
        function deleteEntry(id) {
            vscode.postMessage({ type: 'delete', id });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'questionAnswer':
                    document.getElementById('answerContent').textContent = message.answer;
                    break;
                case 'questionError':
                    document.getElementById('answerContent').innerHTML = '<span style="color: var(--danger)">Error: ' + message.error + '</span>';
                    break;
            }
        });
        
        // Enter key handlers
        document.getElementById('searchInput').addEventListener('keypress', e => {
            if (e.key === 'Enter') searchEntries();
        });
        document.getElementById('askInput').addEventListener('keypress', e => {
            if (e.key === 'Enter') askQuestion();
        });
    </script>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public dispose() {
        KnowledgeManagerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

