import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  Cpu,
  ArrowRight,
  Brain,
  Mic,
  FileText,
  CheckSquare,
  GitBranch,
  Zap,
  BarChart3,
  Camera,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ParticleField } from '../components/effects';

type DashboardMode = 'software' | 'hardware';

export default function LandingPage() {
  const [selectedMode, setSelectedMode] = useState<DashboardMode | null>(null);
  const [hoveredMode, setHoveredMode] = useState<DashboardMode | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedMode) {
      // Store the selected mode
      localStorage.setItem('dashboard_mode', selectedMode);
      navigate('/login');
    }
  };

  const softwareFeatures = [
    { icon: Brain, label: 'AI Knowledge Agent' },
    { icon: CheckSquare, label: 'Task Management' },
    { icon: GitBranch, label: 'Decision Tracking' },
    { icon: Zap, label: 'Automations' },
    { icon: BarChart3, label: 'Team Analytics' },
  ];

  const hardwareFeatures = [
    { icon: Mic, label: 'Voice Capture' },
    { icon: Camera, label: 'Image Notes' },
    { icon: FileText, label: 'Audio Logs' },
    { icon: CheckSquare, label: 'Auto Todo Extraction' },
    { icon: Calendar, label: 'Daily Summaries' },
  ];

  return (
    <div className="min-h-screen bg-[var(--void-deepest)] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Particle Background */}
      <div className="absolute inset-0 opacity-30">
        <ParticleField particleCount={50} connectionDistance={100} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--cosmic-cyan)] to-[var(--cosmic-purple)] flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to <span className="gradient-text">Omni Presence</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Choose your workspace mode based on your team's workflow
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Software Mode Card */}
          <button
            onClick={() => setSelectedMode('software')}
            onMouseEnter={() => setHoveredMode('software')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative p-8 rounded-3xl text-left transition-all duration-500 group
              ${selectedMode === 'software' 
                ? 'glass-elevated border-2 border-[var(--cosmic-cyan)] scale-[1.02]' 
                : 'glass border border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
              animate-slide-up
            `}
            style={{ animationDelay: '100ms' }}
          >
            {/* Glow effect when selected */}
            {selectedMode === 'software' && (
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 pointer-events-none" />
            )}

            <div className="relative">
              {/* Icon */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                ${selectedMode === 'software' 
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30' 
                  : 'bg-[var(--void-surface)] group-hover:bg-gradient-to-br group-hover:from-cyan-500/20 group-hover:to-blue-500/10'}
              `}>
                <Code2 className={`w-8 h-8 ${selectedMode === 'software' ? 'text-white' : 'text-cyan-400'}`} />
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-white mb-2">Software Teams</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                For development teams tracking code decisions, PRs, tasks, and team knowledge across repositories.
              </p>

              {/* Features */}
              <div className="space-y-3">
                {softwareFeatures.map((feature, i) => (
                  <div 
                    key={feature.label}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      hoveredMode === 'software' || selectedMode === 'software' ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <feature.icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-[var(--text-primary)]">{feature.label}</span>
                  </div>
                ))}
              </div>

              {/* Selection indicator */}
              {selectedMode === 'software' && (
                <div className="absolute top-6 right-6 w-6 h-6 rounded-full bg-[var(--cosmic-cyan)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--void-deepest)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Hardware Mode Card */}
          <button
            onClick={() => setSelectedMode('hardware')}
            onMouseEnter={() => setHoveredMode('hardware')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative p-8 rounded-3xl text-left transition-all duration-500 group
              ${selectedMode === 'hardware' 
                ? 'glass-elevated border-2 border-[var(--cosmic-purple)] scale-[1.02]' 
                : 'glass border border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
              animate-slide-up
            `}
            style={{ animationDelay: '150ms' }}
          >
            {/* Glow effect when selected */}
            {selectedMode === 'hardware' && (
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 pointer-events-none" />
            )}

            <div className="relative">
              {/* Icon */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                ${selectedMode === 'hardware' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' 
                  : 'bg-[var(--void-surface)] group-hover:bg-gradient-to-br group-hover:from-purple-500/20 group-hover:to-pink-500/10'}
              `}>
                <Cpu className={`w-8 h-8 ${selectedMode === 'hardware' ? 'text-white' : 'text-purple-400'}`} />
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-white mb-2">Hardware Teams</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                For engineering teams capturing design decisions, schematics, and tacit knowledge through voice and images.
              </p>

              {/* Features */}
              <div className="space-y-3">
                {hardwareFeatures.map((feature, i) => (
                  <div 
                    key={feature.label}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      hoveredMode === 'hardware' || selectedMode === 'hardware' ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <feature.icon className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-[var(--text-primary)]">{feature.label}</span>
                  </div>
                ))}
              </div>

              {/* Selection indicator */}
              {selectedMode === 'hardware' && (
                <div className="absolute top-6 right-6 w-6 h-6 rounded-full bg-[var(--cosmic-purple)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Continue Button */}
        <div className="text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
          <button
            onClick={handleContinue}
            disabled={!selectedMode}
            className={`
              inline-flex items-center gap-3 px-8 py-4 rounded-xl font-medium text-lg transition-all duration-300
              ${selectedMode 
                ? 'btn-primary hover:scale-105' 
                : 'bg-[var(--void-surface)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            Continue to {selectedMode === 'software' ? 'Software' : selectedMode === 'hardware' ? 'Hardware' : ''} Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            You can switch between modes anytime from settings
          </p>
        </div>
      </div>
    </div>
  );
}

