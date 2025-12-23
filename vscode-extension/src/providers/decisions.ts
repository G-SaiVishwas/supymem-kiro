import * as vscode from 'vscode';
import { SupymemAPI } from '../api';

export class DecisionsProvider implements vscode.TreeDataProvider<DecisionItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DecisionItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private decisions: any[] = [];
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
        this.loadDecisions();
    }

    private async loadDecisions() {
        try {
            this.decisions = await this.api.getDecisions();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Failed to load decisions:', error);
            this.decisions = [];
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: DecisionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DecisionItem): Thenable<DecisionItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        if (this.decisions.length === 0) {
            return Promise.resolve([new DecisionItem(
                'No decisions recorded',
                null,
                null,
                null,
                '',
                '',
                true
            )]);
        }

        const items = this.decisions.slice(0, 15).map(decision => new DecisionItem(
            decision.title,
            decision.category,
            decision.importance,
            decision.decided_by,
            decision.created_at,
            decision.id,
            false
        ));

        return Promise.resolve(items);
    }
}

export class DecisionItem extends vscode.TreeItem {
    constructor(
        public readonly title: string,
        public readonly category: string | null,
        public readonly importance: string | null,
        public readonly decidedBy: string | null,
        public readonly createdAt: string,
        public readonly decisionId: string,
        public readonly isPlaceholder: boolean = false
    ) {
        super(title, vscode.TreeItemCollapsibleState.None);

        if (isPlaceholder) {
            this.description = '';
            this.tooltip = 'No decisions found';
            this.contextValue = 'placeholder';
            this.iconPath = new vscode.ThemeIcon('info');
            return;
        }

        const importanceIcons: Record<string, string> = {
            critical: 'flame',
            high: 'warning',
            medium: 'info',
            low: 'circle-outline'
        };

        const importanceColors: Record<string, string> = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        const categoryIcons: Record<string, string> = {
            architecture: 'symbol-structure',
            technology: 'tools',
            process: 'workflow',
            design: 'paintcan',
            security: 'shield',
            performance: 'dashboard'
        };

        this.description = `${importanceColors[importance || 'medium'] || '⚪'} ${category || 'general'}`;
        
        const date = createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown date';
        this.tooltip = new vscode.MarkdownString(
            `**${title}**\n\n` +
            `- Category: ${category || 'N/A'}\n` +
            `- Importance: ${importance || 'N/A'}\n` +
            `- Decided by: ${decidedBy || 'Unknown'}\n` +
            `- Date: ${date}\n\n` +
            `*Click to view details*`
        );
        this.contextValue = 'decision';
        this.iconPath = new vscode.ThemeIcon(
            categoryIcons[category || ''] || importanceIcons[importance || 'medium'] || 'bookmark'
        );

        this.command = {
            command: 'supymem.viewDecision',
            title: 'View Decision',
            arguments: [this]
        };
    }
}
