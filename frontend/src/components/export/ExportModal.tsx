import { useState, useEffect, useCallback } from 'react';
import { 
  getExportPreview, 
  downloadExportPdf, 
  getDefaultTeamId,
  type ExportOptions, 
  type ExportRequest,
  type ExportPreview 
} from '../../api/client';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
}

const defaultOptions: ExportOptions = {
  include_decisions: true,
  include_knowledge: true,
  include_tasks: true,
  include_projects: true,
  include_summaries: false,
  include_statistics: true,
  include_toc: true,
};

export function ExportModal({ isOpen, onClose, teamId }: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [format, setFormat] = useState<'detailed' | 'summary'>('detailed');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTeamId = teamId || getDefaultTeamId();

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExportPreview(effectiveTeamId);
      setPreview(data);
    } catch (err) {
      setError('Failed to load export preview');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [effectiveTeamId]);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, loadPreview]);

  const handleExport = async () => {
    setDownloading(true);
    setError(null);

    try {
      const request: ExportRequest = {
        team_id: effectiveTeamId,
        format,
        options,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      };

      const blob = await downloadExportPdf(request);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `supymem_export_${effectiveTeamId}_${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError('Failed to generate PDF export');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const totalItems = preview 
    ? preview.counts.knowledge_entries + preview.counts.decisions + preview.counts.tasks + preview.counts.projects
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Export Knowledge Base</h2>
              <p className="text-sm text-slate-400">Download as PDF document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Preview Stats */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : preview ? (
            <div className="grid grid-cols-4 gap-4">
              <StatCard 
                label="Knowledge" 
                value={preview.counts.knowledge_entries} 
                color="blue"
                enabled={options.include_knowledge}
              />
              <StatCard 
                label="Decisions" 
                value={preview.counts.decisions} 
                color="purple"
                enabled={options.include_decisions}
              />
              <StatCard 
                label="Tasks" 
                value={preview.counts.tasks} 
                color="emerald"
                enabled={options.include_tasks}
              />
              <StatCard 
                label="Projects" 
                value={preview.counts.projects} 
                color="amber"
                enabled={options.include_projects}
              />
            </div>
          ) : null}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('detailed')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'detailed'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    format === 'detailed' ? 'border-blue-500' : 'border-slate-500'
                  }`}>
                    {format === 'detailed' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Detailed</div>
                    <div className="text-xs text-slate-400">Full content & reasoning</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setFormat('summary')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'summary'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    format === 'summary' ? 'border-blue-500' : 'border-slate-500'
                  }`}>
                    {format === 'summary' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Summary</div>
                    <div className="text-xs text-slate-400">Condensed overview</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Sections to Include */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Include Sections</label>
            <div className="grid grid-cols-2 gap-3">
              <ToggleOption
                label="Statistics & Charts"
                description="Summary statistics"
                enabled={options.include_statistics}
                onChange={() => toggleOption('include_statistics')}
              />
              <ToggleOption
                label="Decisions"
                description={`${preview?.counts.decisions || 0} decisions`}
                enabled={options.include_decisions}
                onChange={() => toggleOption('include_decisions')}
              />
              <ToggleOption
                label="Knowledge Entries"
                description={`${preview?.counts.knowledge_entries || 0} entries`}
                enabled={options.include_knowledge}
                onChange={() => toggleOption('include_knowledge')}
              />
              <ToggleOption
                label="Tasks"
                description={`${preview?.counts.tasks || 0} tasks`}
                enabled={options.include_tasks}
                onChange={() => toggleOption('include_tasks')}
              />
              <ToggleOption
                label="Projects"
                description={`${preview?.counts.projects || 0} projects`}
                enabled={options.include_projects}
                onChange={() => toggleOption('include_projects')}
              />
              <ToggleOption
                label="Daily Summaries"
                description="Recent summaries"
                enabled={options.include_summaries}
                onChange={() => toggleOption('include_summaries')}
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Date Range (Optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Estimated Size */}
          {preview && (
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Estimated pages:</span>
                <span className="text-white font-medium">~{preview.estimated_pages} pages</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">Total items:</span>
                <span className="text-white font-medium">{totalItems} items</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={downloading || loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'emerald' | 'amber';
  enabled: boolean;
}

function StatCard({ label, value, color, enabled }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  };

  const textColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br border transition-opacity ${colorClasses[color]} ${
      enabled ? 'opacity-100' : 'opacity-40'
    }`}>
      <div className={`text-2xl font-bold ${textColors[color]}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}

function ToggleOption({ label, description, enabled, onChange }: ToggleOptionProps) {
  return (
    <button
      onClick={onChange}
      className={`p-3 rounded-xl border text-left transition-all ${
        enabled
          ? 'border-blue-500/50 bg-blue-500/10'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm font-medium ${enabled ? 'text-white' : 'text-slate-400'}`}>
            {label}
          </div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
        <div className={`w-5 h-5 rounded flex items-center justify-center ${
          enabled ? 'bg-blue-500' : 'bg-slate-700'
        }`}>
          {enabled && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

// Convenience export button component
interface ExportButtonProps {
  teamId?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  className?: string;
}

export function ExportButton({ teamId, variant = 'primary', className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${className}`}
          title="Export to PDF"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <ExportModal isOpen={isOpen} onClose={() => setIsOpen(false)} teamId={teamId} />
      </>
    );
  }

  if (variant === 'secondary') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors flex items-center gap-2 ${className}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF
        </button>
        <ExportModal isOpen={isOpen} onClose={() => setIsOpen(false)} teamId={teamId} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 ${className}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export PDF
      </button>
      <ExportModal isOpen={isOpen} onClose={() => setIsOpen(false)} teamId={teamId} />
    </>
  );
}

export default ExportModal;

