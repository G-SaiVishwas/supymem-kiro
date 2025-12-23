import { useState } from 'react';
import {
  CheckSquare,
  Square,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  Plus,
  Mic,
  Edit,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Todo {
  id: string;
  content: string;
  status: TodoStatus;
  priority: Priority;
  dueDate?: string;
  sourceType: 'extracted' | 'manual';
  sourceEntryId?: string;
  createdAt: string;
  projectName?: string;
}

export default function Todos() {
  const [statusFilter, setStatusFilter] = useState<TodoStatus | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTodo, setNewTodo] = useState('');

  // Mock todos
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: '1',
      content: 'Review thermal simulation results before the design review meeting',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-01-18',
      sourceType: 'extracted',
      createdAt: '2024-01-15T10:30:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '2',
      content: 'Verify pin assignments for the new connector with datasheet',
      status: 'pending',
      priority: 'medium',
      sourceType: 'extracted',
      createdAt: '2024-01-15T09:15:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '3',
      content: 'Update BOM for prototype order',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2024-01-17',
      sourceType: 'manual',
      createdAt: '2024-01-14T16:20:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '4',
      content: 'Check EMI compliance requirements for new layout',
      status: 'pending',
      priority: 'medium',
      sourceType: 'extracted',
      createdAt: '2024-01-14T14:00:00Z',
    },
    {
      id: '5',
      content: 'Schedule meeting with Sarah about power rail filtering',
      status: 'completed',
      priority: 'low',
      sourceType: 'extracted',
      createdAt: '2024-01-13T11:30:00Z',
    },
  ]);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'medium': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'low': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return AlertTriangle;
      case 'high': return AlertTriangle;
      default: return Circle;
    }
  };

  const getStatusIcon = (status: TodoStatus) => {
    switch (status) {
      case 'completed': return CheckSquare;
      case 'in_progress': return Clock;
      default: return Square;
    }
  };

  const toggleTodoStatus = (id: string) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const newStatus: TodoStatus = todo.status === 'completed' ? 'pending' : 'completed';
        return { ...todo, status: newStatus };
      }
      return todo;
    }));
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Overdue', color: 'text-red-400' };
    if (days === 0) return { text: 'Today', color: 'text-amber-400' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-amber-400' };
    if (days <= 7) return { text: `${days} days`, color: 'text-blue-400' };
    return { text: date.toLocaleDateString(), color: 'text-[var(--text-muted)]' };
  };

  const filteredTodos = todos.filter(todo => {
    if (statusFilter !== 'all' && todo.status !== statusFilter) return false;
    if (!showCompleted && todo.status === 'completed') return false;
    return true;
  });

  const pendingCount = todos.filter(t => t.status === 'pending').length;
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  const completedCount = todos.filter(t => t.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Todos</h1>
          <p className="text-[var(--text-muted)] mt-1">Tasks extracted from your logs and notes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Pending</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{inProgressCount}</div>
          <div className="text-sm text-[var(--text-muted)]">In Progress</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{completedCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Completed</div>
        </div>
      </div>

      {/* Add Todo */}
      <div className="glass-elevated rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <Plus className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Add a new todo..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTodo.trim()) {
                setTodos([
                  {
                    id: Date.now().toString(),
                    content: newTodo,
                    status: 'pending',
                    priority: 'medium',
                    sourceType: 'manual',
                    createdAt: new Date().toISOString(),
                  },
                  ...todos,
                ]);
                setNewTodo('');
              }
            }}
            className="flex-1 bg-transparent text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                statusFilter === status
                  ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]'
                  : 'bg-[var(--void-surface)] text-[var(--text-secondary)] hover:bg-[var(--void-elevated)]'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-[var(--border-default)] bg-[var(--void-surface)] text-[var(--cosmic-cyan)] focus:ring-[var(--cosmic-cyan)]"
          />
          Show completed
        </label>
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {filteredTodos.map((todo, i) => {
          const StatusIcon = getStatusIcon(todo.status);
          const PriorityIcon = getPriorityIcon(todo.priority);
          const dueInfo = todo.dueDate ? formatDueDate(todo.dueDate) : null;

          return (
            <div
              key={todo.id}
              className={`glass-elevated rounded-xl p-4 hover-glow group transition-all duration-300 animate-slide-up ${
                todo.status === 'completed' ? 'opacity-60' : ''
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodoStatus(todo.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    todo.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-[var(--cosmic-cyan)]'
                  }`}
                >
                  <StatusIcon className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[var(--text-primary)] group-hover:text-white transition-colors ${
                    todo.status === 'completed' ? 'line-through' : ''
                  }`}>
                    {todo.content}
                  </p>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Priority */}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </span>

                    {/* Source */}
                    {todo.sourceType === 'extracted' && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Sparkles className="w-3 h-3" />
                        AI extracted
                      </span>
                    )}

                    {/* Project */}
                    {todo.projectName && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {todo.projectName}
                      </span>
                    )}

                    {/* Due Date */}
                    {dueInfo && (
                      <span className={`flex items-center gap-1 text-xs ${dueInfo.color}`}>
                        <Calendar className="w-3 h-3" />
                        {dueInfo.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTodos.length === 0 && (
          <div className="glass-elevated rounded-2xl p-12 text-center">
            <CheckSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No todos found</h3>
            <p className="text-[var(--text-muted)]">
              Todos will be automatically extracted from your voice logs and notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

