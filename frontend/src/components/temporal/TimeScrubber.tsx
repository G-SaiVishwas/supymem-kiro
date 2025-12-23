import { useState, useCallback } from 'react';
import { 
  Clock, 
  Rewind, 
  FastForward, 
  X, 
  Calendar,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  History,
} from 'lucide-react';
import { useTime } from '../../contexts/TimeContext';

interface TimeScrubberProps {
  className?: string;
}

export function TimeScrubber({ className = '' }: TimeScrubberProps) {
  const { 
    isTimeTraveling, 
    viewingTimestamp, 
    enterTimeTravel, 
    exitTimeTravel, 
    setViewingTime,
    minTimestamp,
    maxTimestamp,
  } = useTime();

  const [isExpanded, setIsExpanded] = useState(false);

  const totalDays = Math.ceil((maxTimestamp.getTime() - minTimestamp.getTime()) / (1000 * 60 * 60 * 24));
  
  const currentPosition = viewingTimestamp 
    ? ((viewingTimestamp.getTime() - minTimestamp.getTime()) / (maxTimestamp.getTime() - minTimestamp.getTime())) * 100
    : 100;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value);
    const timestamp = new Date(
      minTimestamp.getTime() + (percentage / 100) * (maxTimestamp.getTime() - minTimestamp.getTime())
    );
    setViewingTime(timestamp);
  }, [minTimestamp, maxTimestamp, setViewingTime]);

  const jumpDays = useCallback((days: number) => {
    const current = viewingTimestamp || new Date();
    const newDate = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Clamp to bounds
    if (newDate < minTimestamp) {
      setViewingTime(minTimestamp);
    } else if (newDate > maxTimestamp) {
      setViewingTime(maxTimestamp);
    } else {
      setViewingTime(newDate);
    }
  }, [viewingTimestamp, minTimestamp, maxTimestamp, setViewingTime]);

  const startTimeTravel = useCallback(() => {
    // Start from a week ago by default
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    enterTimeTravel(oneWeekAgo);
    setIsExpanded(true);
  }, [enterTimeTravel]);

  // Compact trigger button when not time traveling
  if (!isTimeTraveling) {
    return (
      <button
        onClick={startTimeTravel}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl
          bg-[var(--void-surface)] border border-[var(--border-subtle)]
          text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-default)]
          transition-all
          ${className}
        `}
      >
        <History className="w-4 h-4" />
        <span className="text-sm font-medium">Time Travel</span>
      </button>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Time Travel Mode Banner */}
      <div className="glass-elevated rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-400">Time Travel Mode</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Viewing org state as of {viewingTimestamp?.toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <button
            onClick={exitTimeTravel}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--void-surface)] text-[var(--text-secondary)] hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>

        {/* Scrubber */}
        <div className="space-y-3">
          {/* Date labels */}
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{minTimestamp.toLocaleDateString()}</span>
            <span className="font-medium text-amber-400">
              {viewingTimestamp?.toLocaleDateString()}
            </span>
            <span>{maxTimestamp.toLocaleDateString()}</span>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentPosition}
              onChange={handleSliderChange}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--void-surface)]
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-amber-400
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-amber-500/30
                [&::-webkit-slider-thumb]:cursor-grab
                [&::-webkit-slider-thumb]:active:cursor-grabbing
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-amber-400
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-grab
              "
            />
            {/* Progress fill */}
            <div 
              className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 pointer-events-none"
              style={{ width: `${currentPosition}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => jumpDays(-7)}
              className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-all"
              title="Back 1 week"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => jumpDays(-1)}
              className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-all"
              title="Back 1 day"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewingTime(new Date())}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => jumpDays(1)}
              className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-all"
              title="Forward 1 day"
            >
              <FastForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => jumpDays(7)}
              className="p-2 rounded-lg hover:bg-[var(--void-surface)] text-[var(--text-muted)] hover:text-white transition-all"
              title="Forward 1 week"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-[var(--text-muted)] text-center mt-3">
          All data shown reflects the state at the selected time
        </p>
      </div>
    </div>
  );
}

// Compact version for header
export function TimeTravelIndicator({ className = '' }: { className?: string }) {
  const { isTimeTraveling, viewingTimestamp, exitTimeTravel } = useTime();

  if (!isTimeTraveling) return null;

  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-amber-500/20 border border-amber-500/30
        animate-pulse
        ${className}
      `}
    >
      <Clock className="w-4 h-4 text-amber-400" />
      <span className="text-sm font-medium text-amber-400">
        {viewingTimestamp?.toLocaleDateString()}
      </span>
      <button
        onClick={exitTimeTravel}
        className="p-0.5 rounded hover:bg-amber-500/30 transition-colors"
      >
        <X className="w-3 h-3 text-amber-400" />
      </button>
    </div>
  );
}

export default TimeScrubber;

