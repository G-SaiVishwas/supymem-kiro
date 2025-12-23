import * as vscode from 'vscode';
import { SupymemAPI } from '../api';

export class ActivityProvider implements vscode.TreeDataProvider<ActivityItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ActivityItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private activities: any[] = [];
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
        this.loadActivities();
    }

    private async loadActivities() {
        try {
            this.activities = await this.api.getActivities();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Failed to load activities:', error);
            this.activities = [];
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: ActivityItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ActivityItem): Thenable<ActivityItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        if (this.activities.length === 0) {
            return Promise.resolve([new ActivityItem(
                'No recent activity',
                'info',
                '',
                '',
                null,
                true
            )]);
        }

        const items = this.activities.map(activity => new ActivityItem(
            activity.title,
            activity.type || activity.activity_type,
            activity.user || activity.user_identifier,
            activity.timestamp || activity.created_at,
            activity.source_url || activity.metadata?.url
        ));

        return Promise.resolve(items);
    }
}

export class ActivityItem extends vscode.TreeItem {
    constructor(
        public readonly title: string,
        public readonly type: string,
        public readonly user: string,
        public readonly timestamp: string,
        public readonly sourceUrl: string | null,
        public readonly isPlaceholder: boolean = false
    ) {
        super(title, vscode.TreeItemCollapsibleState.None);

        if (isPlaceholder) {
            this.description = '';
            this.tooltip = 'No activity found';
            this.contextValue = 'placeholder';
            this.iconPath = new vscode.ThemeIcon('info');
            return;
        }

        const typeIcons: Record<string, string> = {
            commit: 'git-commit',
            pr_opened: 'git-pull-request',
            pr_merged: 'git-merge',
            pr_closed: 'git-pull-request-closed',
            pr_review: 'eye',
            task_completed: 'check',
            task_created: 'add',
            issue_opened: 'issues',
            issue_closed: 'issue-closed',
            comment: 'comment'
        };

        const typeLabels: Record<string, string> = {
            commit: '📝 commit',
            pr_opened: '📤 PR opened',
            pr_merged: '🔀 PR merged',
            pr_closed: '❌ PR closed',
            pr_review: '👀 review',
            task_completed: '✅ completed',
            task_created: '📋 created',
            issue_opened: '🐛 issue',
            issue_closed: '✓ closed',
            comment: '💬 comment'
        };

        this.description = `${typeLabels[type] || type} by ${user}`;
        
        const date = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown';
        this.tooltip = new vscode.MarkdownString(
            `**${title}**\n\n` +
            `- Type: ${type}\n` +
            `- By: ${user}\n` +
            `- Time: ${date}\n` +
            (sourceUrl ? `\n[View on GitHub](${sourceUrl})` : '')
        );
        this.contextValue = 'activity';
        this.iconPath = new vscode.ThemeIcon(typeIcons[type] || 'circle-outline');

        if (sourceUrl) {
            this.command = {
                command: 'vscode.open',
                title: 'Open Link',
                arguments: [vscode.Uri.parse(sourceUrl)]
            };
        }
    }
}
