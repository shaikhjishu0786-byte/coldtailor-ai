import { useState } from 'react';
import {
  X,
  Users,
  ScanSearch,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  MailCheck,
  Loader2,
  ShieldCheck,
  Lock,
  AlertCircle,
  Crown,
} from 'lucide-react';

interface RecruiterGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetPass: () => void;
  onTrialActivated: (credits: number) => void;
}

const BLOCKED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'proton.me',
  'tempmail.com',
  'mailinator.com',
  'yopmail.com',
  'guerrillamail.com',
  'aol.com',
  'live.com',
  'msn.com',
  'zoho.com',
  'gmx.com',
  '10minutemail.com',
  'throwawaymail.com',
  'getnada.com',
  'sharklasers.com',
  'dispostable.com',
];

const TRIAL_CLAIMED_KEY = 'coldtailor_recruiter_trial_claimed';

function isTrialClaimed(): boolean {
  try {
    return localStorage.getItem(TRIAL_CLAIMED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTrialClaimed(): void {
  try {
    localStorage.setItem(TRIAL_CLAIMED_KEY, 'true');
  } catch {
    // ignore
  }
}

function getDomainFromEmail(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 ? parts[1] : '';
}

function isBlockedEmail(email: string): boolean {
  const domain = getDomainFromEmail(email);
  return BLOCKED_DOMAINS.includes(domain);
}

function isValidWorkEmail(email: string): boolean {
  return email.trim().length > 0 && email.includes('@') && getDomainFromEmail(email).length > 0;
}

const valueProps = [
  { icon: ScanSearch, text: 'Batch screen candidate resumes with instant Fit/Reject verdicts' },
  { icon: Phone, text: 'Role-specific phone screen questions with expected talking points' },
  { icon: Mail, text: 'Automated shortlist & rejection email templates with feedback' },
];

export function RecruiterGateModal({ isOpen, onClose, onGetPass, onTrialActivated }: RecruiterGateModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [trialClaimed, setTrialClaimed] = useState(false);

  if (!isOpen) return null;

  const handleTrial = () => {
    setError(null);

    if (!isValidWorkEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isBlockedEmail(email)) {
      setError('Please enter a company work email (e.g. name@company.com). Personal emails like Gmail/Yahoo are not eligible for recruiter trials.');
      return;
    }

    if (isTrialClaimed()) {
      setTrialClaimed(true);
      return;
    }

    setStatus('loading');
    setTimeout(() => {
      markTrialClaimed();
      setStatus('success');
      setTimeout(() => {
        onTrialActivated(1);
        setStatus('idle');
        setEmail('');
        onClose();
      }, 1200);
    }, 1000);
  };

  const alreadyClaimed = trialClaimed || isTrialClaimed();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-fade-in-up" />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-sky-500/20 bg-slate-900/80 backdrop-blur-2xl shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              <Users className="h-3.5 w-3.5" />
              Recruiter &amp; Founder Workspace
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-50">
              Unlock Recruiter &amp; Founder{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                Workspace
              </span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Stop spending 20 minutes per resume. Screen candidates in seconds with AI-powered fit analysis.
            </p>
          </div>

          {/* Value props */}
          <div className="mb-6 space-y-3">
            {valueProps.map((vp, i) => {
              const Icon = vp.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5"
                  style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.1}s both` }}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-500/20">
                    <Icon className="h-4 w-4 text-sky-400" />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-200">{vp.text}</span>
                </div>
              );
            })}
          </div>

          {/* CTA 1: Get Recruiter Pass */}
          <button
            onClick={onGetPass}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30"
          >
            Get Recruiter Pass - ₹999/mo
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="border-t border-slate-800" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Or
            </span>
          </div>

          {/* CTA 2: Trial with work email */}
          {status === 'success' ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5 text-sm font-medium text-emerald-300 animate-fade-in-up">
              <CheckCircle2 className="h-4 w-4" />
              1 free screening activated! Enjoy.
            </div>
          ) : alreadyClaimed ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-amber-300">
                <Lock className="h-4 w-4" />
                Trial already redeemed
              </div>
              <p className="text-xs text-slate-400">
                Trial already redeemed on this browser. Unlock Recruiter Pro for unlimited screenings.
              </p>
              <button
                onClick={onGetPass}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:shadow-sky-500/30"
              >
                <Crown className="h-3.5 w-3.5" />
                Unlock Recruiter Pro
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <MailCheck className="h-3.5 w-3.5 text-sky-400" />
                Start 1-Candidate Trial with Work Email
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@company.com"
                  className={`flex-1 rounded-lg border bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:ring-2 ${
                    error
                      ? 'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20'
                      : 'border-slate-700 focus:border-sky-500/50 focus:ring-sky-500/20'
                  }`}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrial()}
                />
                <button
                  onClick={handleTrial}
                  disabled={status === 'loading' || !email.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-40"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Start Trial
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Validation error */}
              {error && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs leading-relaxed text-red-300 animate-fade-in-up">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Domain hint */}
              {!error && (
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Mail className="h-3 w-3" />
                  Must be a company email. Gmail, Yahoo, Outlook, and disposable emails are not accepted.
                </p>
              )}
            </div>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
            <ShieldCheck className="h-3 w-3" />
            No credit card required. 1 free screening, one per browser.
          </p>
        </div>
      </div>
    </div>
  );
}
