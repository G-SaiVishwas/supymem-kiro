import * as vscode from 'vscode';
import { SupymemAPI, ActivityItem as ActivityData } from '../api';

export class ActivityProvider implements vscode.TreeDataProvider<ActivityItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ActivityItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private activities: ActivityData[] = [];
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
            const data = await this.api.getActivities();
            // Normalize the data structure
            this.activities = data.map((a: any) => ({
                id: a.id,
                type: a.type || a.activity_type,
                title: a.title,
                user: a.user || a.user_identifier,
                timestamp: a.timestamp || a.created_at,
                source_url: a.source_url || a.metadata?.url
            }));
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

        // Group by time (today, yesterday, earlier)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);

        const items = this.activities.slice(0, 25).map(activity => {
            const activityDate = new Date(activity.timestamp);
            let timeGroup = '';
            
            if (activityDate >= today) {
                timeGroup = 'today';
            } else if (activityDate >= yesterday) {
                timeGroup = 'yesterday';
            } else {
                timeGroup = 'earlier';
            }

            return new ActivityItem(
                activity.title,
                activity.type,
                activity.user,
                activity.timestamp,
                activity.source_url || null,
                false,
                timeGroup
            );
        });

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
        public readonly isPlaceholder: boolean = false,
        public readonly timeGroup?: string
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
            task_completed: 'pass-filled',
            task_created: 'add',
            issue_opened: 'issues',
            issue_closed: 'issue-closed',
            comment: 'comment',
            knowledge_stored: 'book',
            query: 'search',
            decision_made: 'bookmark'
        };

        const typeLabels: Record<string, string> = {
            commit: '📝 commit',
            pr_opened: '📤 PR opened',
            pr_merged: '🔀 merged',
            pr_closed: '❌ closed',
            pr_review: '👀 review',
            task_completed: '✅ completed',
            task_created: '📋 created',
            issue_opened: '🐛 issue',
            issue_closed: '✓ closed',
            comment: '💬 comment',
            knowledge_stored: '📚 knowledge',
            query: '🔍 query',
            decision_made: '📋 decision'
        };

        // Format time
        const activityDate = new Date(timestamp);
        const timeStr = this._formatTime(activityDate);

        // Description
        this.description = `${typeLabels[type] || type} by @${user} • ${timeStr}`;
        
        // Rich tooltip
        const tooltipLines = [
            `**${title}**`,
            '',
            `- Type: ${type.replace('_', ' ')}`,
            `- By: @${user}`,
            `- Time: ${activityDate.toLocaleString()}`
        ];
        
        if (sourceUrl) {
            tooltipLines.push('', `[View on GitHub](${sourceUrl})`);
        }
        
        this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
        this.contextValue = 'activity';
        
        // Icon with color based on type
        const iconColor = type.includes('merged') || type.includes('completed')
            ? new vscode.ThemeColor('charts.green')
            : type.includes('closed') || type.includes('error')
                ? new vscode.ThemeColor('charts.red')
                : undefined;
                
        this.iconPath = new vscode.ThemeIcon(
            typeIcons[type] || 'circle-outline',
            iconColor
        );

        // Command to open source URL
        if (sourceUrl) {
            this.command = {
                command: 'vscode.open',
                title: 'Open Link',
                arguments: [vscode.Uri.parse(sourceUrl)]
            };
        }
    }

    private _formatTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
