import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  Camera,
  FileText,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Clock,
  CheckSquare,
} from 'lucide-react';

type EntryType = 'all' | 'audio_log' | 'note' | 'image_note' | 'text_log' | 'todo';
type Visibility = 'all' | 'private' | 'project' | 'public';

interface Entry {
  id: string;
  type: EntryType;
  content: string;
  rawTranscript?: string;
  visibility: Visibility;
  createdAt: string;
  duration?: number;
  imageUrl?: string;
  todoStatus?: string;
  projectName?: string;
}

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntryType>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Mock entries
  const entries: Entry[] = [
    {
      id: '1',
      type: 'audio_log',
      content: 'Discussed the thermal management strategy with the team. Key decision was to use a heat spreader instead of active cooling to reduce noise and power consumption. This aligns with our goal of keeping the device under 40dB noise level.',
      visibility: 'project',
      createdAt: '2024-01-15T10:30:00Z',
      duration: 45,
      projectName: 'Board Revision v3',
    },
    {
      id: '2',
      type: 'image_note',
      content: 'Schematic capture of the new voltage regulator circuit. Using the TPS62840 for ultra-low quiescent current.',
      visibility: 'project',
      createdAt: '2024-01-15T09:15:00Z',
      imageUrl: '/placeholder-schematic.png',
      projectName: 'Board Revision v3',
    },
    {
      id: '3',
      type: 'todo',
      content: 'Review thermal simulation results before the design review meeting on Friday',
      visibility: 'private',
      createdAt: '2024-01-15T08:45:00Z',
      todoStatus: 'pending',
    },
    {
      id: '4',
      type: 'text_log',
      content: 'Pin assignment notes: GPIO 12-15 for SPI, GPIO 16-17 for I2C. Need to verify with the connector datasheet.',
      visibility: 'project',
      createdAt: '2024-01-14T16:20:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '5',
      type: 'audio_log',
      content: 'Need to check the EMI compliance requirements for the new layout. Sarah mentioned we might need additional filtering on the power rails.',
      visibility: 'project',
      createdAt: '2024-01-14T14:00:00Z',
      duration: 28,
      projectName: 'Board Revision v3',
    },
  ];

  const getEntryIcon = (type: EntryType) => {
    switch (type) {
      case 'audio_log': return Mic;
      case 'image_note': return Camera;
      case 'note': return FileText;
      case 'todo': return CheckSquare;
      default: return FileText;
    }
  };

  const getEntryColor = (type: EntryType) => {
    switch (type) {
      case 'audio_log': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'image_note': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'note': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'todo': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getVisibilityIcon = (visibility: Visibility) => {
    return visibility === 'private' ? EyeOff : Eye;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredEntries = entries.filter(entry => {
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
    if (visibilityFilter !== 'all' && entry.visibility !== visibilityFilter) return false;
    if (searchQuery && !entry.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notes & Logs</h1>
          <p className="text-[var(--text-muted)] mt-1">Your captured engineering context</p>
        </div>
        <Link
          to="/notes/new"
          className="btn-primary flex items-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Notes Mode
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="glass-elevated rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--void-surface)] border border-[var(--border-subtle)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              showFilters 
                ? 'bg-[var(--cosmic-cyan)]/20 border-[var(--cosmic-cyan)] text-[var(--cosmic-cyan)]' 
                : 'bg-[var(--void-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--border-subtle)] animate-slide-up">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {(['all', 'audio_log', 'image_note', 'note', 'todo'] as EntryType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      typeFilter === type
                        ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]'
                        : 'bg-[var(--void-surface)] text-[var(--text-secondary)] hover:bg-[var(--void-elevated)]'
                    }`}
                  >
                    {type === 'all' ? 'All' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Visibility</label>
              <div className="flex gap-2">
                {(['all', 'private', 'project', 'public'] as Visibility[]).map((vis) => (
                  <button
                    key={vis}
                    onClick={() => setVisibilityFilter(vis)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      visibilityFilter === vis
                        ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]'
                        : 'bg-[var(--void-surface)] text-[var(--text-secondary)] hover:bg-[var(--void-elevated)]'
                    }`}
                  >
                    {vis.charAt(0).toUpperCase() + vis.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry, i) => {
          const Icon = getEntryIcon(entry.type as EntryType);
          const VisIcon = getVisibilityIcon(entry.visibility as Visibility);

          return (
            <div
              key={entry.id}
              className="glass-elevated rounded-2xl p-5 hover-glow group transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getEntryColor(entry.type as EntryType)}`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {entry.type.replace('_', ' ')}
                    </span>
                    {entry.projectName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--void-surface)] text-[var(--text-secondary)]">
                        {entry.projectName}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <VisIcon className="w-3 h-3" />
                      {entry.visibility}
                    </div>
                    {entry.duration && (
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {entry.duration}s
                      </div>
                    )}
                  </div>

                  <p className="text-[var(--text-primary)] group-hover:text-white transition-colors">
                    {entry.content}
                  </p>

                  {entry.imageUrl && (
                    <div className="mt-3 relative w-48 h-32 rounded-lg overflow-hidden bg-[var(--void-surface)]">
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                        <Camera className="w-8 h-8" />
                      </div>
                    </div>
                  )}

                  {entry.todoStatus && (
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        entry.todoStatus === 'pending' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {entry.todoStatus}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.createdAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="glass-elevated rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No entries found</h3>
            <p className="text-[var(--text-muted)]">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'Start capturing your engineering context with Notes Mode'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

