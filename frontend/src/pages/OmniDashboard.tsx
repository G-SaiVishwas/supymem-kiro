import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Camera,
  FileText,
  CheckSquare,
  Image,
  Calendar,
  Search,
  MessageSquare,
  Activity,
  Brain,
  Zap,
  Clock,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceRecording, formatDuration } from '../hooks/useVoiceRecording';
import { AnimatedCounter } from '../components/effects';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href: string;
}

export default function OmniDashboard() {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [pendingTodos, setPendingTodos] = useState<any[]>([]);
  
  const {
    isRecording,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    chunkDuration: 20,
    onChunkReady: (blob, dur) => {
      console.log('Audio chunk ready:', dur, 'seconds');
      // Send to backend for processing
    },
  });

  const toggleListening = () => {
    if (isRecording) {
      stopRecording();
      setIsListening(false);
    } else {
      startRecording();
      setIsListening(true);
    }
  };

  const stats: QuickStat[] = [
    { label: 'Notes Today', value: 12, icon: FileText, color: 'from-cyan-500 to-blue-500', href: '/notes' },
    { label: 'Open Todos', value: 5, icon: CheckSquare, color: 'from-amber-500 to-orange-500', href: '/todos' },
    { label: 'Media Items', value: 8, icon: Image, color: 'from-purple-500 to-pink-500', href: '/media' },
    { label: 'Audio Minutes', value: 47, icon: Clock, color: 'from-green-500 to-emerald-500', href: '/notes' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Section with Voice Control */}
      <div className="glass-aurora rounded-3xl p-8 relative overflow-hidden">
        {/* Animated background based on listening state */}
        <div 
          className={`absolute inset-0 transition-opacity duration-500 ${isListening ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(0, 212, 255, ${0.1 + audioLevel * 0.2}) 0%, transparent 70%)`,
          }}
        />
        
        <div className="relative flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-[var(--cosmic-cyan)]" />
              <span className="text-[var(--text-muted)] text-sm font-medium">Your Personal AI Agent</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl">
              {isListening 
                ? "I'm listening... Speak naturally and I'll capture your thoughts."
                : "Start speaking to capture your engineering context. I'll remember everything."}
            </p>
            
            {/* Voice status */}
            {isListening && (
              <div className="flex items-center gap-4 animate-slide-up">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cosmic-cyan)]/20 border border-[var(--cosmic-cyan)]/30">
                  <div className="w-2 h-2 rounded-full bg-[var(--cosmic-cyan)] animate-pulse" />
                  <span className="text-[var(--cosmic-cyan)] font-medium">{formatDuration(duration)}</span>
                </div>
                
                {/* Audio level indicator */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[var(--cosmic-cyan)] transition-all duration-75"
                      style={{
                        height: `${8 + (audioLevel > i * 0.2 ? (audioLevel - i * 0.2) * 30 : 0)}px`,
                        opacity: audioLevel > i * 0.2 ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice Button */}
          <button
            onClick={toggleListening}
            className={`
              relative w-24 h-24 rounded-full flex items-center justify-center
              transition-all duration-300 group
              ${isListening 
                ? 'bg-[var(--cosmic-cyan)] shadow-lg shadow-cyan-500/50' 
                : 'bg-[var(--void-surface)] border-2 border-[var(--border-default)] hover:border-[var(--cosmic-cyan)]'}
            `}
          >
            {/* Pulsing rings when listening */}
            {isListening && (
              <>
                <div 
                  className="absolute inset-0 rounded-full bg-[var(--cosmic-cyan)] animate-ping opacity-30"
                  style={{ animationDuration: '1.5s' }}
                />
                <div 
                  className="absolute inset-[-10px] rounded-full border-2 border-[var(--cosmic-cyan)] opacity-30 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
              </>
            )}
            
            {isListening ? (
              <MicOff className="w-10 h-10 text-[var(--void-deepest)]" />
            ) : (
              <Mic className="w-10 h-10 text-[var(--text-primary)] group-hover:text-[var(--cosmic-cyan)] transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="glass rounded-2xl p-5 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-[var(--cosmic-green)]" />
            </div>
            <p className="text-3xl font-bold text-white">
              <AnimatedCounter value={stat.value} />
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/notes/new"
          className="glass-elevated rounded-2xl p-6 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-[var(--cosmic-cyan)] transition-colors">
                Notes Mode
              </h3>
              <p className="text-sm text-[var(--text-muted)]">Capture images + audio</p>
            </div>
          </div>
        </Link>

        <Link
          to="/ask"
          className="glass-elevated rounded-2xl p-6 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: '250ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-[var(--cosmic-cyan)] transition-colors">
                Ask Agent
              </h3>
              <p className="text-sm text-[var(--text-muted)]">Query your knowledge base</p>
            </div>
          </div>
        </Link>

        <Link
          to="/todos"
          className="glass-elevated rounded-2xl p-6 hover-glow group transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <CheckSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-[var(--cosmic-cyan)] transition-colors">
                Review Todos
              </h3>
              <p className="text-sm text-[var(--text-muted)]">5 items pending</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Recent Activity & Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-[var(--cosmic-cyan)]" />
              Recent Activity
            </h2>
            <Link to="/notes" className="text-sm text-[var(--cosmic-cyan)] hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {/* Mock recent entries */}
            {[
              { type: 'audio', content: 'Discussed power management strategy for the new board revision...', time: '5 min ago', icon: Mic },
              { type: 'note', content: 'Captured schematic of the voltage regulator circuit', time: '23 min ago', icon: Camera },
              { type: 'todo', content: 'Review thermal simulation results before next meeting', time: '1 hr ago', icon: CheckSquare },
              { type: 'audio', content: 'Need to verify the pin assignments for the new connector...', time: '2 hrs ago', icon: Mic },
            ].map((entry, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-[var(--void-surface)] hover:bg-[var(--void-elevated)] transition-colors cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  entry.type === 'audio' ? 'bg-cyan-500/20 text-cyan-400' :
                  entry.type === 'note' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  <entry.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm line-clamp-2 group-hover:text-white transition-colors">
                    {entry.content}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">{entry.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[var(--cosmic-purple)]" />
              Today's Summary
            </h2>
            <Link to="/summaries" className="text-sm text-[var(--cosmic-cyan)] hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20">
              <h4 className="text-cyan-400 font-medium mb-2">🎯 Work Performed</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Reviewed thermal simulation for board revision</li>
                <li>• Captured schematics for voltage regulator</li>
                <li>• Discussed power management strategy</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
              <h4 className="text-amber-400 font-medium mb-2">📋 Open Todos</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Review thermal simulation results</li>
                <li>• Verify pin assignments for new connector</li>
                <li>• Update BOM for prototype</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20">
              <h4 className="text-purple-400 font-medium mb-2">💡 Key Decisions</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Use buck converter instead of LDO for efficiency</li>
                <li>• Move to 4-layer PCB for EMI compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Semantic Search */}
      <div className="glass-elevated rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '450ms' }}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search across all your notes, decisions, and context..."
              className="w-full pl-12 pr-4 py-4 bg-[var(--void-surface)] border border-[var(--border-subtle)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cosmic-cyan)] focus:ring-2 focus:ring-[var(--cosmic-cyan)]/20 transition-all"
            />
          </div>
          <button className="btn-primary px-6 py-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

