import { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  FileText,
  Mic,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  User,
  Building,
} from 'lucide-react';

interface DaySummary {
  date: string;
  summaryType: 'engineer' | 'project' | 'team';
  summary: string;
  workPerformed: string[];
  keyDecisions: string[];
  openTodos: string[];
  blockers: string[];
  highlights: string[];
  metrics: {
    entriesProcessed: number;
    audioMinutes: number;
    todosCreated: number;
    todosCompleted: number;
  };
}

export default function Summaries() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily');

  // Mock summaries
  const summaries: DaySummary[] = [
    {
      date: '2024-01-15',
      summaryType: 'engineer',
      summary: 'Focused day on thermal design and power management. Made significant progress on the board revision, including capturing key schematics and discussing strategy with the team.',
      workPerformed: [
        'Reviewed thermal simulation results for board revision',
        'Captured voltage regulator schematic (TPS62840)',
        'Discussed thermal management strategy with team',
        'Analyzed EMI compliance requirements',
      ],
      keyDecisions: [
        'Use heat spreader instead of active cooling for noise reduction',
        'Target sub-40dB noise level for final product',
        'Add additional filtering on power rails per EMI requirements',
      ],
      openTodos: [
        'Verify pin assignments for new connector',
        'Update BOM for prototype order',
        'Complete thermal simulation review',
      ],
      blockers: [],
      highlights: [
        'Thermal management approach finalized',
        'Key schematic captured for documentation',
      ],
      metrics: {
        entriesProcessed: 12,
        audioMinutes: 47,
        todosCreated: 3,
        todosCompleted: 2,
      },
    },
    {
      date: '2024-01-14',
      summaryType: 'engineer',
      summary: 'Documentation and planning day. Focused on pin assignments and preparing for the upcoming design review.',
      workPerformed: [
        'Documented pin assignments for SPI and I2C',
        'Reviewed connector datasheet',
        'Prepared notes for design review',
      ],
      keyDecisions: [
        'GPIO 12-15 assigned for SPI interface',
        'GPIO 16-17 assigned for I2C interface',
      ],
      openTodos: [
        'Verify connector compatibility',
        'Review thermal simulation',
      ],
      blockers: [
        'Waiting for updated connector datasheet from vendor',
      ],
      highlights: [],
      metrics: {
        entriesProcessed: 8,
        audioMinutes: 28,
        todosCreated: 2,
        todosCompleted: 1,
      },
    },
  ];

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentSummary = summaries.find(
    s => s.date === selectedDate.toISOString().split('T')[0]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Daily Summaries</h1>
          <p className="text-[var(--text-muted)] mt-1">AI-generated summaries of your work</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-[var(--void-surface)] rounded-lg p-1">
          <button
            onClick={() => setViewType('daily')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewType === 'daily' 
                ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]' 
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewType('weekly')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewType === 'weekly' 
                ? 'bg-[var(--cosmic-cyan)] text-[var(--void-deepest)]' 
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="glass-elevated rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDay('prev')}
            className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--cosmic-cyan)]" />
            <span className="text-lg font-medium text-white">{formatDate(selectedDate)}</span>
          </div>

          <button
            onClick={() => navigateDay('next')}
            className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-colors"
            disabled={selectedDate >= new Date()}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {currentSummary ? (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white">{currentSummary.metrics.entriesProcessed}</div>
              <div className="text-xs text-[var(--text-muted)]">Entries</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <Mic className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">{currentSummary.metrics.audioMinutes}</div>
              <div className="text-xs text-[var(--text-muted)]">Audio mins</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{currentSummary.metrics.todosCreated}</div>
              <div className="text-xs text-[var(--text-muted)]">Todos created</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{currentSummary.metrics.todosCompleted}</div>
              <div className="text-xs text-[var(--text-muted)]">Completed</div>
            </div>
          </div>

          {/* Summary */}
          <div className="glass-elevated rounded-2xl p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">{currentSummary.summary}</p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Work Performed */}
            <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                Work Performed
              </h3>
              <ul className="space-y-2">
                {currentSummary.workPerformed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-cyan-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Decisions */}
            <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-purple-400" />
                </div>
                Key Decisions
              </h3>
              <ul className="space-y-2">
                {currentSummary.keyDecisions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-purple-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Open Todos */}
            <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                </div>
                Open Todos
              </h3>
              <ul className="space-y-2">
                {currentSummary.openTodos.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-amber-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Blockers */}
            {currentSummary.blockers.length > 0 && (
              <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  Blockers
                </h3>
                <ul className="space-y-2">
                  {currentSummary.blockers.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <span className="text-red-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Highlights */}
            {currentSummary.highlights.length > 0 && (
              <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  Highlights
                </h3>
                <ul className="space-y-2">
                  {currentSummary.highlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <span className="text-green-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="glass-elevated rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No summary for this day</h3>
          <p className="text-[var(--text-muted)]">
            Summaries are generated at the end of each day based on your activity
          </p>
        </div>
      )}
    </div>
  );
}

