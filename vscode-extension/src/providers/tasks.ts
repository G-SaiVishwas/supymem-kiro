import * as vscode from 'vscode';
import { SupymemAPI, TaskItem as TaskData } from '../api';

export class TasksProvider implements vscode.TreeDataProvider<TaskItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tasks: TaskData[] = [];
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

        // Group by status
        const pending = this.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const completed = this.tasks.filter(t => t.status === 'completed');

        const items: TaskItem[] = [
            ...pending.map(task => new TaskItem(
                task.title,
                task.status,
                task.priority,
                task.id,
                false,
                task.due_date,
                task.description
            )),
            ...completed.slice(0, 5).map(task => new TaskItem(
                task.title,
                task.status,
                task.priority,
                task.id,
                false,
                task.due_date,
                task.description
            ))
        ];

        return Promise.resolve(items);
    }
}

export class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly title: string,
        public readonly status: string,
        public readonly priority: string,
        public readonly taskId: string,
        public readonly isPlaceholder: boolean = false,
        public readonly dueDate?: string,
        public readonly description?: string
    ) {
        super(title, vscode.TreeItemCollapsibleState.None);

        if (isPlaceholder) {
            this.description = '';
            this.tooltip = 'No tasks found';
            this.contextValue = 'placeholder';
            this.iconPath = new vscode.ThemeIcon('info');
            return;
        }

        const priorityColors: Record<string, string> = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        const statusIcons: Record<string, string> = {
            pending: 'circle-outline',
            in_progress: 'sync~spin',
            completed: 'pass-filled',
            failed: 'error'
        };

        // Build description
        const descParts = [priorityColors[priority] || '⚪'];
        if (status === 'in_progress') {
            descParts.push('in progress');
        } else if (status !== 'pending') {
            descParts.push(status.replace('_', ' '));
        }
        
        this.description = descParts.join(' ');
        
        // Build tooltip
        const tooltipLines = [
            `**${title}**`,
            '',
            `- Status: ${status}`,
            `- Priority: ${priority}`
        ];
        
        if (dueDate) {
            const due = new Date(dueDate);
            const isOverdue = due < new Date() && status !== 'completed';
            tooltipLines.push(`- Due: ${due.toLocaleDateString()}${isOverdue ? ' ⚠️ OVERDUE' : ''}`);
        }
        
        if (description) {
            tooltipLines.push('', description.slice(0, 200));
        }
        
        tooltipLines.push('', '*Click to toggle completion*');
        
        this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
        this.contextValue = status === 'completed' ? 'completedTask' : 'pendingTask';
        
        // Icon with color
        this.iconPath = new vscode.ThemeIcon(
            statusIcons[status] || 'circle-outline',
            status === 'completed' 
                ? new vscode.ThemeColor('charts.green') 
                : priority === 'urgent' 
                    ? new vscode.ThemeColor('charts.red')
                    : undefined
        );

        // Command to toggle
        this.command = {
            command: 'supymem.toggleTask',
            title: 'Toggle Task',
            arguments: [this]
        };
    }
}
