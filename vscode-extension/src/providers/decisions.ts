import * as vscode from 'vscode';
import { SupymemAPI, DecisionSummary } from '../api';

export class DecisionsProvider implements vscode.TreeDataProvider<DecisionItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DecisionItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private decisions: DecisionSummary[] = [];
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

        // Group by category
        const byCategory = new Map<string, DecisionSummary[]>();
        this.decisions.forEach(d => {
            const cat = d.category || 'general';
            if (!byCategory.has(cat)) {
                byCategory.set(cat, []);
            }
            byCategory.get(cat)!.push(d);
        });

        // Flatten but limit
        const items = this.decisions.slice(0, 20).map(decision => new DecisionItem(
            decision.title,
            decision.category || null,
            decision.importance || null,
            decision.decided_by || null,
            decision.created_at,
            decision.id,
            false,
            decision.summary
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
        public readonly isPlaceholder: boolean = false,
        public readonly summary?: string
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
            performance: 'dashboard',
            feature: 'lightbulb'
        };

        // Description with importance and category
        const descParts = [importanceColors[importance || 'medium'] || '⚪'];
        if (category) {
            descParts.push(category);
        }
        this.description = descParts.join(' ');
        
        // Rich tooltip
        const date = createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown date';
        const tooltipLines = [
            `**${title}**`,
            ''
        ];
        
        if (summary) {
            tooltipLines.push(summary, '');
        }
        
        tooltipLines.push(
            `- Category: ${category || 'N/A'}`,
            `- Importance: ${importance || 'N/A'}`,
            `- Decided by: ${decidedBy || 'Unknown'}`,
            `- Date: ${date}`,
            '',
            '*Click to view details and reasoning*'
        );
        
        this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
        this.contextValue = 'decision';
        
        // Icon based on category or importance
        this.iconPath = new vscode.ThemeIcon(
            categoryIcons[category || ''] || importanceIcons[importance || 'medium'] || 'bookmark',
            importance === 'critical' || importance === 'high' 
                ? new vscode.ThemeColor('charts.orange')
                : undefined
        );

        // Command to view decision
        this.command = {
            command: 'supymem.viewDecision',
            title: 'View Decision',
            arguments: [this]
        };
    }
}
