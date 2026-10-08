import { useState, useEffect, useCallback } from 'react';
import { Component, type ReactNode } from 'react';
import type { Tier } from '@/types';
import {
  X,
  Crown,
  Check,
  Zap,
  FileText,
  Send,
  Users,
  Phone,
  Mail,
  KanbanSquare,
  Loader2,
  ExternalLink,
  Target,
  Building,
  Sparkles,
  Database,
  Headphones,
  TrendingUp,
  Rocket,
  ScanSearch,
  Infinity as InfinityIcon,
  ShieldCheck,
} from 'lucide-react';

type Role = 'jobseeker' | 'recruiter';
type Duration = '3months' | '6months' | '1year';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole: Role;
  onUpgradeJobSeeker: (tier: Tier) => void;
  onUpgradeRecruiter: (tier: Tier) => void;
}

interface DurationPlan {
  name: string;
  duration: Duration;
  priceINR: string;
  billedLabel: string;
  monthlyBreakdown: string;
  badge?: string;
  features: { icon: typeof Users; text: string }[];
}

const jobSeekerPlans: DurationPlan[] = [
  {
    name: 'Placement Sprint',
    duration: '3months',
    priceINR: '₹499',
    billedLabel: 'billed quarterly',
    monthlyBreakdown: '~₹166/month',
    features: [
      { icon: FileText, text: 'Unlimited 1-Click ATS Tailored PDF Resumes' },
      { icon: ScanSearch, text: 'Keyword & Missing Skills Gap Analysis' },
      { icon: Send, text: 'LinkedIn Connect & Cold Email Generator' },
      { icon: KanbanSquare, text: 'Application Tracker (Save up to 50 Jobs)' },
    ],
  },
  {
    name: 'Career Pro',
    duration: '6months',
    priceINR: '₹899',
    billedLabel: 'billed semi-annually',
    monthlyBreakdown: '~₹150/month',
    badge: 'Most Popular',
    features: [
      { icon: Sparkles, text: 'Everything in Placement Sprint +' },
      { icon: Send, text: 'Multi-Platform Follow-up Sequences (Email + InMail)' },
      { icon: KanbanSquare, text: 'Unlimited Applications in Tracker' },
      { icon: Zap, text: 'Priority AI Analysis Speed' },
    ],
  },
  {
    name: 'All-Access Pass',
    duration: '1year',
    priceINR: '₹1,499',
    billedLabel: 'billed annually',
    monthlyBreakdown: '~₹125/month',
    badge: 'Best Value (Save 50%)',
    features: [
      { icon: Crown, text: 'Everything in Career Pro +' },
      { icon: InfinityIcon, text: 'Full 365 Days Uncapped Pro Access' },
      { icon: Rocket, text: 'All Future AI Feature Upgrades Included' },
      { icon: TrendingUp, text: 'VIP Career Roadmap & Export Access' },
    ],
  },
];

const recruiterPlans: DurationPlan[] = [
  {
    name: 'Hiring Sprint',
    duration: '3months',
    priceINR: '₹5,999',
    billedLabel: 'billed quarterly',
    monthlyBreakdown: '~₹2,000/month',
    features: [
      { icon: Users, text: 'Screen up to 250 Candidates' },
      { icon: FileText, text: 'Bulk Resume Evaluation (Up to 10 at once)' },
      { icon: Phone, text: 'Tailored Phone Screen Questions' },
      { icon: Mail, text: 'Shortlist CSV Export' },
    ],
  },
  {
    name: 'Growth Recruiter',
    duration: '6months',
    priceINR: '₹11,499',
    billedLabel: 'billed semi-annually',
    monthlyBreakdown: '~₹1,916/month',
    badge: 'Most Popular',
    features: [
      { icon: Users, text: 'Screen up to 1,000 Candidates' },
      { icon: FileText, text: 'Unlimited Bulk Uploads & Fit Matrix' },
      { icon: FileText, text: 'Executive PDF & CSV Reports' },
      { icon: Database, text: 'Pipeline Archiving' },
    ],
  },
  {
    name: 'Enterprise Annual Pass',
    duration: '1year',
    priceINR: '₹21,499',
    billedLabel: 'billed annually',
    monthlyBreakdown: '~₹1,791/month',
    badge: 'Best Value',
    features: [
      { icon: Users, text: 'Unlimited Candidate Screenings' },
      { icon: Zap, text: 'Priority AI Processing' },
      { icon: TrendingUp, text: 'Full Pipeline History & Analytics' },
      { icon: Headphones, text: 'Dedicated Enterprise Support' },
    ],
  },
];

const roleConfig = {
  jobseeker: {
    label: 'For Job Seekers',
    icon: Target,
    glow: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    border: 'border-amber-500/40',
    gradText: 'from-amber-400 to-orange-400',
    gradBtn: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    plans: jobSeekerPlans,
    iconColor: 'bg-amber-500/20 text-amber-400',
  },
  recruiter: {
    label: 'For Recruiters & Hiring Teams',
    icon: Building,
    glow: 'bg-sky-500/10',
    ring: 'ring-sky-500/30',
    border: 'border-sky-500/40',
    gradText: 'from-sky-400 to-blue-400',
    gradBtn: 'from-sky-400 to-blue-500',
    shadow: 'shadow-sky-500/20',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    plans: recruiterPlans,
    iconColor: 'bg-sky-500/20 text-sky-400',
  },
};

const durationLabels: Record<Duration, string> = {
  '3months': '3 Months',
  '6months': '6 Months',
  '1year': '1 Year',
};

const RAZORPAY_URLS: Record<Role, string> = {
  jobseeker: 'https://rzp.io/rzp/sfWHvfOP',
  recruiter: 'https://rzp.io/rzp/ritvGar',
};

const badgeStyles: Record<string, string> = {
  'Most Popular': 'bg-gradient-to-r from-amber-400 to-orange-500',
  'Best Value': 'bg-gradient-to-r from-emerald-400 to-cyan-500',
  'Best Value (Save 50%)': 'bg-gradient-to-r from-emerald-400 to-cyan-500',
};

export function PricingModal({
  isOpen,
  onClose,
  initialRole,
  onUpgradeJobSeeker,
  onUpgradeRecruiter,
}: PricingModalProps) {
  const [role, setRole] = useState<Role>(initialRole ?? 'jobseeker');
  const [jsDuration, setJsDuration] = useState<Duration>('6months');
  const [recDuration, setRecDuration] = useState<Duration>('6months');
  const [processing, setProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [showRefInput, setShowRefInput] = useState(false);
  const [refError, setRefError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole(initialRole ?? 'jobseeker');
      setShowRefInput(false);
      setPaymentRef('');
      setRefError(false);
      setProcessing(false);
    }
  }, [isOpen, initialRole]);

  const handleCheckout = useCallback(() => {
    const url = RAZORPAY_URLS[role] ?? RAZORPAY_URLS.jobseeker;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      console.error('[PricingModal] Failed to open Razorpay URL:', url);
    }
    setShowRefInput(true);
  }, [role]);

  const handleVerifyRef = useCallback(() => {
    const trimmed = paymentRef.trim();
    if (trimmed.length < 4) {
      setRefError(true);
      return;
    }
    try { localStorage.setItem('coldtailor_payment_ref', trimmed); } catch { /* ignore */ }
    const selectedTier = (role === 'jobseeker' ? jsDuration : recDuration) as Tier;
    if (role === 'jobseeker') onUpgradeJobSeeker(selectedTier);
    else onUpgradeRecruiter(selectedTier);
    onClose();
    setPaymentRef('');
    setShowRefInput(false);
    setRefError(false);
  }, [paymentRef, role, jsDuration, recDuration, onUpgradeJobSeeker, onUpgradeRecruiter, onClose]);

  if (!isOpen) return null;

  const cfg = roleConfig[role] ?? roleConfig.jobseeker;
  const currentDuration = role === 'jobseeker' ? jsDuration : recDuration;
  const setCurrentDuration = role === 'jobseeker' ? setJsDuration : setRecDuration;
  const plans = cfg.plans ?? [];
  const activePlan = plans.find((p) => p.duration === currentDuration) ?? plans[0];

  if (!activePlan) {
    console.error('[PricingModal] No active plan found for role:', role, 'duration:', currentDuration);
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-white">
          <p className="text-sm text-slate-300">Unable to load pricing plans. Please try again.</p>
          <button onClick={onClose} className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full ${cfg.glow} blur-3xl transition-all duration-500`} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-slate-700/10 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full border ${cfg.badge} px-3 py-1 text-xs font-medium transition-all duration-300`}>
              <Crown className="h-3.5 w-3.5" />
              Upgrade to ColdTailor Pro
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Choose your{' '}
              <span className={`bg-gradient-to-r ${cfg.gradText} bg-clip-text text-transparent transition-all duration-300`}>
                Pro plan
              </span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {role === 'jobseeker'
                ? 'Land more interviews with AI-tailored resumes & outreach.'
                : 'Screen candidates faster with AI-powered fit analysis.'}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="mb-5 flex justify-center">
            <div className="inline-flex items-center rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                onClick={() => setRole('jobseeker')}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  role === 'jobseeker'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="h-4 w-4" />
                For Job Seekers
              </button>
              <button
                onClick={() => setRole('recruiter')}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  role === 'recruiter'
                    ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="h-4 w-4" />
                For Recruiters
              </button>
            </div>
          </div>

          {/* Duration Switcher */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {(Object.keys(durationLabels) as Duration[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => setCurrentDuration(dur)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-300 ${
                    currentDuration === dur
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {durationLabels[dur]}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Card */}
          <div className="mx-auto max-w-lg">
            <div
              className={`group relative overflow-hidden rounded-2xl border ${cfg.border} bg-gradient-to-b ${role === 'jobseeker' ? 'from-amber-500/10 to-slate-900/40' : 'from-sky-500/10 to-slate-900/40'} p-6 shadow-lg ${cfg.shadow} transition-all duration-500`}
            >
              <div className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ${cfg.ring}`} />

              {/* Badge */}
              {activePlan.badge && (
                <div className={`absolute right-0 top-0 rounded-bl-xl ${badgeStyles[activePlan.badge] ?? 'bg-gradient-to-r from-slate-400 to-slate-500'} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950`}>
                  {activePlan.badge}
                </div>
              )}

              <div className="relative">
                <h3 className="mb-3 pt-4 text-base font-semibold text-slate-100">
                  {activePlan.name}
                </h3>

                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-50 transition-all duration-300">
                    {activePlan.priceINR}
                  </span>
                </div>
                <p className="mb-5 text-xs text-slate-500">
                  {activePlan.billedLabel} · {activePlan.monthlyBreakdown}
                </p>

                <ul className="mb-6 space-y-3">
                  {activePlan.features.map((feat, i) => {
                    const Icon = feat.icon;
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${cfg.iconColor}`}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="leading-relaxed">
                          <Icon className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                          {feat.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {!showRefInput ? (
                  <button
                    onClick={handleCheckout}
                    disabled={processing}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${cfg.gradBtn} px-4 py-3 text-sm font-bold text-slate-950 shadow-lg ${cfg.shadow} transition-all hover:shadow-xl disabled:opacity-60`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Get Instant Pro Access
                        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-xs text-emerald-300">
                      <Check className="mr-1 inline h-3.5 w-3.5" />
                      Payment page opened in a new tab. Enter your Razorpay Order ID or Payment Reference below to activate Pro.
                    </div>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => { setPaymentRef(e.target.value); setRefError(false); }}
                      placeholder="e.g. pay_NKq2bX3abc or order_QL8mZ4def"
                      className={`w-full rounded-xl border bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:ring-2 ${refError ? 'border-red-500/50 focus:ring-red-500/20' : 'border-slate-700 focus:border-sky-500/50 focus:ring-sky-500/20'}`}
                    />
                    {refError && (
                      <p className="text-xs text-red-400">Please enter a valid payment reference (at least 4 characters).</p>
                    )}
                    <button
                      onClick={handleVerifyRef}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${cfg.gradBtn} px-4 py-3 text-sm font-bold text-slate-950 shadow-lg ${cfg.shadow} transition-all hover:shadow-xl`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Verify & Activate Pro
                    </button>
                    <button
                      onClick={() => { setShowRefInput(false); setPaymentRef(''); setRefError(false); }}
                      className="w-full text-center text-xs text-slate-500 transition hover:text-slate-300"
                    >
                      Back to plan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Secure checkout powered by Razorpay &amp; Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
