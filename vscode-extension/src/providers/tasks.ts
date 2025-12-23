import * as vscode from 'vscode';
import { SupymemAPI } from '../api';

export class TasksProvider implements vscode.TreeDataProvider<TaskItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tasks: any[] = [];
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
        this.loadTasks();
    }

    private async loadTasks() {
        try {
            this.tasks = await this.api.getTasks();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.tasks = [];
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: TaskItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TaskItem): Thenable<TaskItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        if (this.tasks.length === 0) {
            return Promise.resolve([new TaskItem(
                'No tasks assigned',
                'info',
                'low',
                '',
                true
            )]);
        }

        const items = this.tasks.map(task => new TaskItem(
            task.title,
            task.status,
            task.priority,
            task.id,
            false
        ));

        return Promise.resolve(items);
    }
}

export class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly title: string,
        public readonly status: string,
        public readonly priority: string,
        public readonly taskId: string,
        public readonly isPlaceholder: boolean = false
    ) {
        super(title, vscode.TreeItemCollapsibleState.None);

        if (isPlaceholder) {
            this.description = '';
            this.tooltip = 'No tasks found';
            this.contextValue = 'placeholder';
            this.iconPath = new vscode.ThemeIcon('info');
            return;
        }

        const priorityIcons: Record<string, string> = {
            urgent: 'circle-filled',
            high: 'circle-large-outline',
            medium: 'circle-outline',
            low: 'circle-small'
        };

        const priorityColors: Record<string, string> = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        const statusIcons: Record<string, string> = {
            pending: 'clock',
            in_progress: 'sync~spin',
            completed: 'check',
            failed: 'error'
        };

        this.description = `${priorityColors[priority] || '⚪'} ${status.replace('_', ' ')}`;
        this.tooltip = new vscode.MarkdownString(
            `**${title}**\n\n` +
            `- Status: ${status}\n` +
            `- Priority: ${priority}\n\n` +
            `*Click to toggle completion*`
        );
        this.contextValue = status === 'completed' ? 'completedTask' : 'pendingTask';
        this.iconPath = new vscode.ThemeIcon(
            statusIcons[status] || 'circle-outline',
            status === 'completed' 
                ? new vscode.ThemeColor('charts.green') 
                : undefined
        );

        // Add command to toggle completion
        this.command = {
            command: 'supymem.toggleTask',
            title: 'Toggle Task',
            arguments: [this]
        };
    }
}
