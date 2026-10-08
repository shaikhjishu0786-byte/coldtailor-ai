import { useState, type FormEvent } from 'react';
import { Sparkles, Building, Target, Loader2, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'signin' | 'signup';
type UserRole = 'jobseeker' | 'recruiter';

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('jobseeker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { role },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo + tagline */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
              <Sparkles className="h-7 w-7 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              ColdTailor<span className="text-amber-400"> AI</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              AI-Powered ATS Resume Tailoring & Candidate Screening
            </p>
          </div>

          {/* Auth card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Mode toggle */}
            <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-950/50 p-1">
              <button
                onClick={() => { setMode('signin'); setError(null); }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector — signup only */}
              {mode === 'signup' && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('jobseeker')}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${role === 'jobseeker' ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                    >
                      <Target className={`h-6 w-6 ${role === 'jobseeker' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className={`text-sm font-semibold ${role === 'jobseeker' ? 'text-amber-300' : 'text-slate-400'}`}>Job Seeker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('recruiter')}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${role === 'recruiter' ? 'border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                    >
                      <Building className={`h-6 w-6 ${role === 'recruiter' ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className={`text-sm font-semibold ${role === 'recruiter' ? 'text-sky-300' : 'text-slate-400'}`}>Recruiter</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-center text-xs text-slate-600">
            By continuing, you agree to ColdTailor AI's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
