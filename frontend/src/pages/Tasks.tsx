import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock, AlertCircle, Filter, MoreVertical } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask } from '../api/client';
import type { Task } from '../types';

const priorityColors = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

const statusIcons = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
  failed: AlertCircle,
};

function TaskCard({ task, onUpdate, onDelete }: { task: Task; onUpdate: (id: string, updates: Partial<Task>) => void; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const StatusIcon = statusIcons[task.status];

  return (
    <div className="glass rounded-xl p-4 hover:glow transition-all animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => onUpdate(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              task.status === 'completed'
                ? 'bg-green-500 border-green-500'
                : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {task.status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1">
            <h3
              className={`font-medium ${
                task.status === 'completed' ? 'line-through text-[var(--color-text-muted)]' : ''
              }`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.assigned_to && (
                <span className="text-xs text-[var(--color-text-muted)]">→ {task.assigned_to}</span>
              )}
              {task.source && (
                <span className="text-xs text-[var(--color-text-muted)]">via {task.source}</span>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 w-36 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg shadow-xl z-10">
              <button
                onClick={() => {
                  onUpdate(task.id, { status: 'in_progress' });
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-border)] transition-colors"
              >
                Start Working
              </button>
              <button
                onClick={() => {
                  onDelete(task.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[var(--color-border)] transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (task: Partial<Task>) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title,
      description: description || undefined,
      priority,
      assigned_to: assignedTo || undefined,
      team_id: undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] resize-none h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Assign To</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Username"
                className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => updateTask(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Manage team tasks and action items</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{tasksByStatus.pending}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Pending</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{tasksByStatus.in_progress}</p>
          <p className="text-sm text-[var(--color-text-muted)]">In Progress</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{tasksByStatus.completed}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
        <div className="flex gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">No tasks found</div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreate={(task) => createMutation.mutate(task)}
        />
      )}
    </div>
  );
}

