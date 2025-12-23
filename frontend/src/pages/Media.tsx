import { useState } from 'react';
import {
  Image,
  Mic,
  Video,
  FileText,
  Grid,
  List,
  Search,
  Filter,
  Calendar,
  Play,
  Pause,
  Eye,
  Download,
  Trash2,
  X,
} from 'lucide-react';

type MediaType = 'all' | 'image' | 'audio' | 'video' | 'document';
type ViewMode = 'grid' | 'list';

interface MediaItem {
  id: string;
  type: MediaType;
  fileName: string;
  fileSize: number;
  duration?: number;
  transcript?: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt: string;
  projectName?: string;
}

export default function Media() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [typeFilter, setTypeFilter] = useState<MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Mock media items
  const mediaItems: MediaItem[] = [
    {
      id: '1',
      type: 'image',
      fileName: 'voltage_regulator_schematic.png',
      fileSize: 2400000,
      description: 'Schematic of the TPS62840 voltage regulator circuit with input/output capacitors and inductor values marked.',
      createdAt: '2024-01-15T09:15:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '2',
      type: 'audio',
      fileName: 'thermal_discussion.webm',
      fileSize: 850000,
      duration: 45,
      transcript: 'Discussed the thermal management strategy with the team. Key decision was to use a heat spreader instead of active cooling to reduce noise and power consumption.',
      createdAt: '2024-01-15T10:30:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '3',
      type: 'image',
      fileName: 'pcb_layout_draft.png',
      fileSize: 3200000,
      description: 'Initial PCB layout showing component placement for the power section.',
      createdAt: '2024-01-14T16:20:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '4',
      type: 'audio',
      fileName: 'connector_notes.webm',
      fileSize: 620000,
      duration: 28,
      transcript: 'Need to check the EMI compliance requirements for the new layout. Sarah mentioned we might need additional filtering on the power rails.',
      createdAt: '2024-01-14T14:00:00Z',
    },
    {
      id: '5',
      type: 'image',
      fileName: 'test_setup_photo.jpg',
      fileSize: 1800000,
      description: 'Test setup for measuring power consumption in different operating modes.',
      createdAt: '2024-01-13T11:30:00Z',
      projectName: 'Board Revision v3',
    },
    {
      id: '6',
      type: 'audio',
      fileName: 'daily_standup.webm',
      fileSize: 1200000,
      duration: 68,
      transcript: 'Standup notes: Working on thermal simulation today. Will share results by end of day.',
      createdAt: '2024-01-13T09:00:00Z',
    },
  ];

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return Image;
      case 'audio': return Mic;
      case 'video': return Video;
      case 'document': return FileText;
      default: return FileText;
    }
  };

  const getTypeColor = (type: MediaType) => {
    switch (type) {
      case 'image': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'audio': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'video': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'document': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredItems = mediaItems.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.fileName.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.transcript?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const imageCount = mediaItems.filter(m => m.type === 'image').length;
  const audioCount = mediaItems.filter(m => m.type === 'audio').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Media Library</h1>
          <p className="text-[var(--text-muted)] mt-1">Images, audio recordings, and documents</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-[var(--void-surface)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]' 
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]' 
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Image className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{imageCount}</div>
            <div className="text-sm text-[var(--text-muted)]">Images</div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Mic className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{audioCount}</div>
            <div className="text-sm text-[var(--text-muted)]">Audio clips</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-elevated rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--void-surface)] border border-[var(--border-subtle)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'image', 'audio'] as MediaType[]).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  typeFilter === type
                    ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]'
                    : 'bg-[var(--void-surface)] text-[var(--text-secondary)] hover:bg-[var(--void-elevated)]'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, i) => {
            const Icon = getTypeIcon(item.type);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="glass-elevated rounded-xl overflow-hidden cursor-pointer hover-glow group transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-[var(--void-surface)] flex items-center justify-center relative">
                  {item.type === 'image' ? (
                    <Image className="w-12 h-12 text-purple-400 opacity-50" />
                  ) : (
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full ${getTypeColor(item.type)} flex items-center justify-center`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      {item.duration && (
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[var(--void-deepest)] text-xs text-white">
                          {formatDuration(item.duration)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                      <Eye className="w-5 h-5 text-white" />
                    </button>
                    <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm text-white truncate">{item.fileName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[var(--text-muted)]">{formatFileSize(item.fileSize)}</span>
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, i) => {
            const Icon = getTypeIcon(item.type);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="glass-elevated rounded-xl p-4 cursor-pointer hover-glow group transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getTypeColor(item.type)}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{item.fileName}</p>
                    {item.description && (
                      <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">{item.description}</p>
                    )}
                    {item.transcript && (
                      <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">{item.transcript}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                    {item.duration && (
                      <span className="flex items-center gap-1">
                        <Mic className="w-4 h-4" />
                        {formatDuration(item.duration)}
                      </span>
                    )}
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="glass-elevated rounded-2xl p-12 text-center">
          <Image className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No media found</h3>
          <p className="text-[var(--text-muted)]">
            Capture images and audio using Notes Mode
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="glass-elevated rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-lg font-bold text-white">{selectedItem.fileName}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedItem.type === 'image' ? (
                <div className="aspect-video bg-[var(--void-surface)] rounded-xl flex items-center justify-center">
                  <Image className="w-24 h-24 text-purple-400 opacity-50" />
                </div>
              ) : (
                <div className="p-6 bg-[var(--void-surface)] rounded-xl">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPlayingAudio(playingAudio === selectedItem.id ? null : selectedItem.id)}
                      className="w-12 h-12 rounded-full bg-[var(--cosmic-cyan)] flex items-center justify-center"
                    >
                      {playingAudio === selectedItem.id ? (
                        <Pause className="w-6 h-6 text-[var(--void-deepest)]" />
                      ) : (
                        <Play className="w-6 h-6 text-[var(--void-deepest)] ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-[var(--border-subtle)] rounded-full">
                        <div className="h-full w-1/3 bg-[var(--cosmic-cyan)] rounded-full" />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
                        <span>0:00</span>
                        <span>{selectedItem.duration ? formatDuration(selectedItem.duration) : '--:--'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.description && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Description</h4>
                  <p className="text-white">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.transcript && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Transcript</h4>
                  <p className="text-white">{selectedItem.transcript}</p>
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                <span>Size: {formatFileSize(selectedItem.fileSize)}</span>
                <span>Created: {formatDate(selectedItem.createdAt)}</span>
                {selectedItem.projectName && <span>Project: {selectedItem.projectName}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

