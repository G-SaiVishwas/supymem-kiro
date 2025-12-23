import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ParticleField } from '../components/effects';
import { Sparkles, ArrowRight, Brain, Code2, CheckSquare, GitBranch, Zap, BarChart3 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err?.response?.data?.detail || 'Invalid email or password';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@demo.com', icon: '👑', color: 'from-purple-500 to-pink-500' },
    { label: 'Manager', email: 'manager@demo.com', icon: '👔', color: 'from-cyan-500 to-blue-500' },
    { label: 'Member', email: 'member@demo.com', icon: '👤', color: 'from-green-500 to-emerald-500' },
    { label: 'Viewer', email: 'viewer@demo.com', icon: '👁', color: 'from-orange-500 to-amber-500' },
  ];

  const features = [
    { icon: Brain, label: 'AI Knowledge Agent', desc: 'Team memory that never forgets' },
    { icon: CheckSquare, label: 'Task Management', desc: 'Track work across repos' },
    { icon: GitBranch, label: 'Decision Tracking', desc: 'Why was this built this way?' },
    { icon: Zap, label: 'Automations', desc: 'Automate your workflow' },
    { icon: BarChart3, label: 'Team Analytics', desc: 'Insights into team performance' },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--void-deepest)] overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0c0c12]">
        {/* Subtle Particle Background */}
        <div className="absolute inset-0 opacity-40">
          <ParticleField particleCount={40} connectionDistance={80} />
        </div>
        
        {/* Simple subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0c12]/50 to-[#0c0c12]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/30 flex items-center justify-center shadow-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white tracking-tight leading-tight">
                  Supymem
                </span>
                <span className="text-sm font-medium -mt-1 text-cyan-400">
                  Knowledge Hub
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div className="animate-slide-up stagger-2">
              <h1 className="text-5xl font-bold leading-tight">
                <span className="text-white">Your team's</span>
                <br />
                <span className="gradient-text">collective memory</span>
              </h1>
              <p className="mt-6 text-xl text-[var(--text-secondary)] max-w-md leading-relaxed">
                The AI knowledge agent that never forgets. Track decisions, tasks, and context across your codebase.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 animate-slide-up stagger-3">
              {features.map((feature, i) => (
                <div 
                  key={feature.label}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 cursor-default group"
                  style={{ animationDelay: `${(i + 3) * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--cosmic-cyan)] to-[var(--cosmic-purple)] flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{feature.label}</p>
                    <p className="text-sm text-[var(--text-muted)]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="animate-slide-up stagger-5 text-[var(--text-muted)] text-sm">
            Trusted by innovative teams worldwide
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--void-deep)] via-[var(--void-mid)] to-[var(--void-deep)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--cosmic-cyan)] rounded-full blur-[200px] opacity-5" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12 animate-slide-up">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--cosmic-cyan)] to-[var(--cosmic-purple)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Supymem</span>
          </div>

          {/* Form Card */}
          <div className="glass-elevated rounded-3xl p-8 animate-slide-up stagger-1">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                Sign in to continue to your workspace
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-pop-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Email
                </label>
                <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'transform scale-[1.02]' : ''}`}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="input-cosmic w-full"
                    placeholder="you@company.com"
                    required
                  />
                  {focusedField === 'email' && (
                    <div className="absolute inset-0 -z-10 bg-[var(--cosmic-cyan)] rounded-xl blur-xl opacity-20 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Password
                </label>
                <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'transform scale-[1.02]' : ''}`}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="input-cosmic w-full"
                    placeholder="••••••••"
                    required
                  />
                  {focusedField === 'password' && (
                    <div className="absolute inset-0 -z-10 bg-[var(--cosmic-purple)] rounded-xl blur-xl opacity-20 animate-pulse" />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-[var(--text-muted)]">Don't have an account? </span>
              <Link to="/register" className="text-[var(--cosmic-cyan)] hover:text-white transition-colors font-medium">
                Create one
              </Link>
            </div>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 animate-slide-up stagger-3">
            <p className="text-center text-[var(--text-muted)] text-sm mb-4">
              Quick access with demo accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              {demoAccounts.map((account, i) => (
                <button
                  key={account.email}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('Demo@123');
                  }}
                  className={`
                    relative group p-3 rounded-xl border border-white/5 bg-white/5
                    hover:bg-white/10 hover:border-white/10 transition-all duration-300
                    hover:scale-105 active:scale-95
                  `}
                  style={{ animationDelay: `${(i + 4) * 50}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${account.color} rounded-xl opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <span className="relative flex items-center gap-2 justify-center">
                    <span className="text-lg">{account.icon}</span>
                    <span className="text-[var(--text-primary)] text-sm font-medium">{account.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
