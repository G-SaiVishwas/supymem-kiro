import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  Edit3,
  Trash2,
  Eye,
  Send,
  X,
  Loader2,
  Archive,
  CheckCircle,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import {
  getCentralKnowledge,
  getCentralKnowledgeCategories,
  getCentralKnowledgeStats,
  createCentralKnowledge,
  updateCentralKnowledge,
  publishCentralKnowledge,
  archiveCentralKnowledge,
  deleteCentralKnowledge,
  type CentralKnowledgeEntry,
  type CentralKnowledgeCategory,
  type CentralKnowledgeCreate,
  type CentralKnowledgeUpdate,
} from '../api/client';
import { useAuth, useIsManager } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

const categoryIcons: Record<string, string> = {
  process: '🔄',
  convention: '📏',
  architecture: '🏗️',
  onboarding: '🚀',
  guideline: '📋',
  faq: '❓',
  other: '📄',
};

const categoryColors: Record<string, string> = {
  process: 'from-blue-500 to-cyan-500',
  convention: 'from-purple-500 to-pink-500',
  architecture: 'from-amber-500 to-orange-500',
  onboarding: 'from-green-500 to-emerald-500',
  guideline: 'from-indigo-500 to-violet-500',
  faq: 'from-rose-500 to-red-500',
  other: 'from-slate-500 to-gray-500',
};

const statusColors: Record<string, string> = {
  draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

interface EditorModalProps {
  entry: CentralKnowledgeEntry | null;
  categories: CentralKnowledgeCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CentralKnowledgeCreate | CentralKnowledgeUpdate, publish?: boolean) => void;
  isSaving: boolean;
}

function EditorModal({ entry, categories, isOpen, onClose, onSave, isSaving }: EditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setSummary(entry.summary || '');
      setCategory(entry.category);
      setTags(entry.tags || []);
    } else {
      setTitle('');
      setContent('');
      setSummary('');
      setCategory('other');
      setTags([]);
    }
    setTagInput('');
    setShowPreview(false);
  }, [entry, isOpen]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = (publish = false) => {
    const data = {
      title,
      content,
      summary: summary || undefined,
      category,
      tags,
      status: publish ? 'published' as const : 'draft' as const,
    };
    onSave(data, publish);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-[var(--void-surface)] border border-[var(--void-border)] rounded-2xl shadow-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--void-border)]">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {entry ? <Edit3 className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            {entry ? 'Edit Knowledge Entry' : 'Create Knowledge Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--void-deeper)] transition-colors text-[var(--text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className="w-full px-4 py-3 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors"
              />
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl text-white focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors appearance-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {categoryIcons[cat.value] || '📄'} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Summary (optional)
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary..."
                  className="w-full px-4 py-3 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors"
                />
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Content (Markdown) <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    showPreview
                      ? 'bg-[var(--cosmic-cyan)]/20 text-[var(--cosmic-cyan)]'
                      : 'bg-[var(--void-deeper)] text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              <div className={`grid ${showPreview ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content in Markdown format...

# Heading
## Subheading

- Bullet point
- Another point

**Bold text** and *italic text*

```code block```"
                  rows={12}
                  className="w-full px-4 py-3 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors font-mono text-sm resize-none"
                />
                {showPreview && (
                  <div className="p-4 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl overflow-auto prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{content || '*No content yet...*'}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-[var(--cosmic-purple)]/20 text-[var(--cosmic-purple)] rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-4 py-2 bg-[var(--void-deeper)] border border-[var(--void-border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors text-sm"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-[var(--void-deeper)] hover:bg-[var(--void-border)] rounded-xl text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--void-border)] bg-[var(--void-deeper)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={!title.trim() || !content.trim() || isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--void-surface)] border border-[var(--void-border)] hover:border-[var(--cosmic-cyan)] rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!title.trim() || !content.trim() || isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EntryCardProps {
  entry: CentralKnowledgeEntry;
  onEdit: (entry: CentralKnowledgeEntry) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

function EntryCard({ entry, onEdit, onPublish, onArchive, onDelete, canEdit }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-2xl p-5 hover:border-[var(--cosmic-cyan)]/30 transition-all group animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Category Icon */}
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[entry.category] || categoryColors.other} flex items-center justify-center flex-shrink-0 shadow-lg`}
        >
          <span className="text-xl">{categoryIcons[entry.category] || '📄'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg truncate">{entry.title}</h3>
              {entry.summary && (
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{entry.summary}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[entry.status]}`}
              >
                {entry.status === 'draft' && '📝 '}
                {entry.status === 'published' && '✅ '}
                {entry.status === 'archived' && '📦 '}
                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {entry.created_by_name || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString() : 'N/A'}
            </span>
            <span className="px-2 py-0.5 bg-[var(--void-deeper)] rounded-full">{entry.category}</span>
            {entry.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[var(--cosmic-purple)]/10 text-[var(--cosmic-purple)] rounded-full">
                {tag}
              </span>
            ))}
            {entry.tags && entry.tags.length > 3 && (
              <span className="text-[var(--text-muted)]">+{entry.tags.length - 3} more</span>
            )}
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className="mt-4 p-4 bg-[var(--void-deeper)] rounded-xl border border-[var(--void-border)]">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{entry.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--void-deeper)] hover:bg-[var(--void-border)] rounded-lg text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              {expanded ? 'Collapse' : 'Expand'}
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            
            {canEdit && (
              <>
                <button
                  onClick={() => onEdit(entry)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--void-deeper)] hover:bg-[var(--void-border)] rounded-lg text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                
                {entry.status === 'draft' && (
                  <button
                    onClick={() => onPublish(entry.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-sm text-green-400 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish
                  </button>
                )}
                
                {entry.status !== 'archived' && (
                  <button
                    onClick={() => onArchive(entry.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--void-deeper)] hover:bg-amber-500/20 rounded-lg text-sm text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                
                <button
                  onClick={() => onDelete(entry.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--void-deeper)] hover:bg-red-500/20 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CentralKnowledge() {
  const { currentOrg } = useAuth();
  const isManager = useIsManager();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CentralKnowledgeEntry | null>(null);

  // Queries
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['centralKnowledge', filterCategory, filterStatus],
    queryFn: () => getCentralKnowledge(filterCategory || undefined, filterStatus || undefined),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['centralKnowledgeCategories'],
    queryFn: getCentralKnowledgeCategories,
  });

  const { data: stats } = useQuery({
    queryKey: ['centralKnowledgeStats'],
    queryFn: getCentralKnowledgeStats,
    enabled: isManager,
  });

  const entries = entriesData?.entries || [];
  const categories = categoriesData?.categories || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CentralKnowledgeCreate) => createCentralKnowledge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralKnowledge'] });
      queryClient.invalidateQueries({ queryKey: ['centralKnowledgeStats'] });
      setIsEditorOpen(false);
      setEditingEntry(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CentralKnowledgeUpdate }) => updateCentralKnowledge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralKnowledge'] });
      setIsEditorOpen(false);
      setEditingEntry(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishCentralKnowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralKnowledge'] });
      queryClient.invalidateQueries({ queryKey: ['centralKnowledgeStats'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveCentralKnowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralKnowledge'] });
      queryClient.invalidateQueries({ queryKey: ['centralKnowledgeStats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCentralKnowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centralKnowledge'] });
      queryClient.invalidateQueries({ queryKey: ['centralKnowledgeStats'] });
    },
  });

  // Handlers
  const handleCreate = () => {
    setEditingEntry(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (entry: CentralKnowledgeEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleSave = (data: CentralKnowledgeCreate | CentralKnowledgeUpdate, publish?: boolean) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: data as CentralKnowledgeUpdate });
      if (publish && editingEntry.status !== 'published') {
        publishMutation.mutate(editingEntry.id);
      }
    } else {
      createMutation.mutate({ ...(data as CentralKnowledgeCreate), status: publish ? 'published' : 'draft' });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  // Filter entries by search
  const filteredEntries = entries.filter((entry) =>
    searchQuery
      ? entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  // Group entries by category
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const cat = entry.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {} as Record<string, CentralKnowledgeEntry[]>);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            Central Knowledge
          </h1>
          <p className="text-[var(--text-muted)] mt-2">
            Curated, authoritative team knowledge — your single source of truth
          </p>
        </div>
        
        {isManager && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-5 h-5" />
            New Entry
          </button>
        )}
      </div>

      {/* Stats - Manager only */}
      {isManager && stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">Total Entries</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">Published</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.published}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">Drafts</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{stats.drafts}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">Categories</p>
            <p className="text-2xl font-bold text-[var(--cosmic-cyan)] mt-1">
              {Object.keys(stats.by_category).length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full pl-12 pr-4 py-3 bg-[var(--void-surface)] border border-[var(--void-border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--text-muted)]" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-[var(--void-surface)] border border-[var(--void-border)] rounded-xl text-white focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {categoryIcons[cat.value]} {cat.label}
              </option>
            ))}
          </select>

          {isManager && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-[var(--void-surface)] border border-[var(--void-border)] rounded-xl text-white focus:outline-none focus:border-[var(--cosmic-cyan)] transition-colors appearance-none cursor-pointer min-w-[130px]"
            >
              <option value="">All Status</option>
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
              <option value="archived">📦 Archived</option>
            </select>
          )}

          <div className="flex items-center bg-[var(--void-surface)] border border-[var(--void-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-[var(--cosmic-cyan)]/20 text-[var(--cosmic-cyan)]' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-[var(--cosmic-cyan)]/20 text-[var(--cosmic-cyan)]' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--cosmic-cyan)]" />
          <span className="ml-3 text-[var(--text-muted)]">Loading knowledge base...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookOpen className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No knowledge entries yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            {isManager
              ? 'Start building your central knowledge database by creating your first entry.'
              : 'No published knowledge entries are available yet.'}
          </p>
          {isManager && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium"
            >
              <Plus className="w-5 h-5" />
              Create First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([category, categoryEntries]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryColors[category] || categoryColors.other} flex items-center justify-center`}
                >
                  <span>{categoryIcons[category] || '📄'}</span>
                </div>
                <h2 className="text-lg font-semibold text-white capitalize">{category}</h2>
                <span className="px-2 py-0.5 bg-[var(--void-deeper)] rounded-full text-xs text-[var(--text-muted)]">
                  {categoryEntries.length}
                </span>
              </div>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                {categoryEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEdit}
                    onPublish={(id) => publishMutation.mutate(id)}
                    onArchive={(id) => archiveMutation.mutate(id)}
                    onDelete={handleDelete}
                    canEdit={isManager}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <EditorModal
        entry={editingEntry}
        categories={categories}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

