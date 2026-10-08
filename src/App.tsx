import { useState, useCallback, useEffect, Component, type ReactNode } from 'react';
import {
  Sparkles,
  Briefcase,
  Building2,
  Upload,
  User,
  Wand2,
  AlertCircle,
  Loader2,
  Zap,
  RotateCcw,
  Crown,
  KanbanSquare,
  Target,
  Users,
  Building,
  ScanSearch,
  UsersRound,
  Eye,
  Lock,
  X,
  LogOut,
} from 'lucide-react';
import type { AnalysisResult, AppMode, BulkCandidate, Tier } from '@/types';
import { analyzeWithGemini } from '@/lib/gemini';
import { deriveRecruiterInsights, TIER_CONFIGS, isPaidTier } from '@/types';
import { OutputDashboard } from '@/components/OutputDashboard';
import { DragDropResume } from '@/components/DragDropResume';
import { BulkResumeInput, createEmptySlot, type ResumeSlot } from '@/components/BulkResumeInput';
import { CandidateLeaderboard } from '@/components/CandidateLeaderboard';
import { PricingModal } from '@/components/PricingModal';
import { TrackerDrawer, loadTracker, loadPipeline, savePipelineEntries, type PipelineEntry } from '@/components/TrackerDrawer';
import { RecruiterGateModal } from '@/components/RecruiterGateModal';
import { SocialProofToast } from '@/components/SocialProofToast';
import { AuthGate } from '@/components/AuthGate';
import { supabase, type UserProfile } from '@/lib/supabaseClient';
import { CheckCircle2, ShieldCheck, Star, Users as UsersIcon } from 'lucide-react';

const RECRUITER_TIER_KEY = 'coldtailor_recruiter_tier';
const JOB_SEEKER_TIER_KEY = 'coldtailor_job_seeker_tier';
const RECRUITER_TRIAL_KEY = 'coldtailor_recruiter_trial_credits';
const RECRUITER_SCREENING_COUNT_KEY = 'coldtailor_recruiter_screening_count';
const FREE_TAILOR_LIMIT = 2;
const APP_VERSION_KEY = 'coldtailor_app_version';
const CURRENT_VERSION = '2026-10-08-v1';

const DEMO_JD = `Senior Frontend Engineer - Acme Corp

We are seeking a Senior Frontend Engineer to join our fast-growing platform team. You will own end-to-end frontend architecture for our customer-facing dashboard used by 50,000+ businesses.

Requirements:
- 5+ years of production React/TypeScript experience
- Deep knowledge of modern CSS, Tailwind, and responsive design
- Experience with state management (Redux, Zustand, or Context)
- Familiarity with CI/CD pipelines and testing (Jest, Playwright)
- Strong understanding of web performance optimization
- Excellent communication and cross-functional collaboration skills

Nice to have: Next.js, GraphQL, design systems, accessibility (WCAG)`;

const DEMO_JOB_TITLE = 'Senior Frontend Engineer';
const DEMO_COMPANY = 'Acme Corp';

function makeDemoResult(atsScore: number, missing: string[], bullets: string[]): AnalysisResult {
  return {
    atsScore,
    missingKeywords: missing,
    tailoredBullets: bullets,
    coldDM: '',
    linkedInNote: '',
    coldEmail: { subject: '', body: '' },
    followUpNote: '',
  };
}

const demoCandidates: BulkCandidate[] = [
  {
    id: 'demo-1',
    label: 'Sarah Chen',
    resumeText: '[Sample Resume]',
    result: makeDemoResult(92, ['GraphQL'], [
      'Led migration to TypeScript across 200k LOC codebase, reducing runtime errors by 40%',
      'Built design system with 60+ reusable components adopted by 8 teams',
      'Optimized Lighthouse score from 62 to 98 using code-splitting and lazy loading',
    ]),
    fitVerdict: 'strong',
    fitScore: 92,
    strengths: ['7 years React/TypeScript', 'Design system leadership', 'Performance optimization expert'],
    disqualifiers: ['No GraphQL experience'],
  },
  {
    id: 'demo-2',
    label: 'Marcus Johnson',
    resumeText: '[Sample Resume]',
    result: makeDemoResult(75, ['CI/CD', 'Playwright'], [
      'Developed customer dashboard serving 20k users with React and Tailwind',
      'Implemented Zustand state management replacing legacy Redux setup',
      'Collaborated with design team on responsive layout overhaul',
    ]),
    fitVerdict: 'moderate',
    fitScore: 75,
    strengths: ['4 years React experience', 'Strong CSS/Tailwind skills', 'State management expertise'],
    disqualifiers: ['Limited CI/CD experience', 'No automated testing background'],
  },
  {
    id: 'demo-3',
    label: 'Priya Patel',
    resumeText: '[Sample Resume]',
    result: makeDemoResult(44, ['TypeScript', 'Redux', 'CI/CD', 'Performance', 'Jest'], [
      '2 years experience building jQuery-based marketing sites',
      'Basic HTML/CSS knowledge with some React exposure',
    ]),
    fitVerdict: 'weak',
    fitScore: 44,
    strengths: ['Some React exposure', 'Eager to learn'],
    disqualifiers: ['Only 2 years frontend experience', 'No TypeScript', 'No testing or CI/CD'],
  },
];

function getRecruiterTrialCredits(): number {
  try {
    return parseInt(localStorage.getItem(RECRUITER_TRIAL_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setRecruiterTrialCreditsLocalStorage(n: number): void {
  try {
    localStorage.setItem(RECRUITER_TRIAL_KEY, String(n));
  } catch {
    // ignore
  }
}

function getRecruiterTier(): Tier {
  try {
    const val = localStorage.getItem(RECRUITER_TIER_KEY);
    if (val === '3months' || val === '6months' || val === '1year') return val;
    return 'free';
  } catch {
    return 'free';
  }
}

function setRecruiterTierLocalStorage(tier: Tier): void {
  try {
    localStorage.setItem(RECRUITER_TIER_KEY, tier);
  } catch {
    // ignore
  }
}

function getJobSeekerTier(): Tier {
  try {
    const val = localStorage.getItem(JOB_SEEKER_TIER_KEY);
    if (val === '3months' || val === '6months' || val === '1year') return val;
    return 'free';
  } catch {
    return 'free';
  }
}

function setJobSeekerTierLocalStorage(tier: Tier): void {
  try {
    localStorage.setItem(JOB_SEEKER_TIER_KEY, tier);
  } catch {
    // ignore
  }
}

function getRecruiterScreeningCount(): number {
  try {
    return parseInt(localStorage.getItem(RECRUITER_SCREENING_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setRecruiterScreeningCountLocalStorage(n: number): void {
  try {
    localStorage.setItem(RECRUITER_SCREENING_COUNT_KEY, String(n));
  } catch {
    // ignore
  }
}

function clearStaleStateIfNeeded(): void {
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem(JOB_SEEKER_TIER_KEY);
      localStorage.removeItem(RECRUITER_TIER_KEY);
      localStorage.removeItem(RECRUITER_TRIAL_KEY);
      localStorage.removeItem(RECRUITER_SCREENING_COUNT_KEY);
      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
    }
  } catch {
    // ignore
  }
}

clearStaleStateIfNeeded();

class PricingModalBoundary extends Component<{ children: ReactNode; onClose: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.error('[PricingModalBoundary] Runtime error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={this.props.onClose}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-white">
            <p className="text-sm text-slate-300">Something went wrong loading the pricing modal. Please try again.</p>
            <button onClick={() => { this.setState({ hasError: false }); this.props.onClose(); }} className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [resumeText, setResumeText] = useState('');

  // Bulk recruiter state
  const [bulkSlots, setBulkSlots] = useState<ResumeSlot[]>([]);
  const [bulkCandidates, setBulkCandidates] = useState<BulkCandidate[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showRecruiterGate, setShowRecruiterGate] = useState(false);
  const [jobSeekerTier, setJobSeekerTier] = useState<Tier>(() => getJobSeekerTier());
  const [mode, setMode] = useState<AppMode>('jobseeker');
  const [pricingRole, setPricingRole] = useState<'jobseeker' | 'recruiter'>('jobseeker');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Recruiter state
  const [recruiterTier, setRecruiterTier] = useState<Tier>(() => getRecruiterTier());
  const [recruiterTrialCredits, setRecruiterTrialCredits] = useState(() => getRecruiterTrialCredits());
  const [recruiterScreeningCount, setRecruiterScreeningCount] = useState(() => getRecruiterScreeningCount());

  // Job seeker free trial tracking (cloud-synced via Supabase)
  const [jobSeekerTailorCount, setJobSeekerTailorCount] = useState(0);
  const [showTrialExpiredToast, setShowTrialExpiredToast] = useState(false);

  // Auth state
  const [session, setSession] = useState<ReturnType<typeof supabase.auth.getSession> extends Promise<{ data: { session: infer S } }> ? S : null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isJobSeekerPro = profile?.is_pro ?? isPaidTier(jobSeekerTier);
  const tailorsRemaining = Math.max(0, FREE_TAILOR_LIMIT - jobSeekerTailorCount);
  const trialExpired = !isJobSeekerPro && jobSeekerTailorCount >= FREE_TAILOR_LIMIT;


  // Separate tracker counts per mode
  const [trackerCountJs, setTrackerCountJs] = useState(() => loadTracker('jobseeker').length);
  const [trackerCountRec, setTrackerCountRec] = useState(() => loadTracker('recruiter').length);
  const trackerCount = mode === 'recruiter' ? trackerCountRec : trackerCountJs;

  const recruiterUnlocked = isPaidTier(recruiterTier) || recruiterTrialCredits > 0;

  // Fetch profile from Supabase and sync local state
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch profile:', error);
      return;
    }
    if (data) {
      const p = data as UserProfile;
      setProfile(p);
      setJobSeekerTailorCount(p.trials_used);
      if (p.role === 'recruiter') {
        setMode('recruiter');
      } else {
        setMode('jobseeker');
      }
    }
  }, []);

  // Auth: check session on mount, subscribe to changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const s = data.session;
      setSession(s as typeof session);
      if (s?.user?.id) {
        await fetchProfile(s.user.id);
      }
      setAuthLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        setSession(s as typeof session);
        if (s?.user?.id) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setJobSeekerTailorCount(0);
        }
        setAuthLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setJobSeekerTailorCount(0);
    setResult(null);
    setBulkCandidates([]);
    setBulkSlots([]);
    setJobDescription('');
    setJobTitle('');
    setCompanyName('');
    setResumeText('');
  };

  const triggerRecruiterPaywall = () => {
    setPricingRole('recruiter');
    setShowPricing(true);
  };

  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    if (newMode === 'recruiter' && !isPaidTier(recruiterTier)) {
      setIsDemoMode(true);
      setJobTitle(DEMO_JOB_TITLE);
      setCompanyName(DEMO_COMPANY);
      setJobDescription(DEMO_JD);
      setBulkCandidates(demoCandidates);
      setBulkSlots([]);
    } else if (newMode === 'recruiter' && isPaidTier(recruiterTier)) {
      setIsDemoMode(false);
      setBulkCandidates([]);
    } else {
      setIsDemoMode(false);
      setBulkCandidates([]);
    }
  };

  const handleRecruiterGateClose = () => {
    setShowRecruiterGate(false);
  };

  const handleTrialActivated = (credits: number) => {
    setRecruiterTrialCreditsLocalStorage(credits);
    setRecruiterTrialCredits(credits);
  };

  const handleJDFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRecruiterMode && !isPaidTier(recruiterTier)) {
      triggerRecruiterPaywall();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setJobDescription(text);
        setIsDemoMode(false);
        setBulkCandidates([]);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkScreen = useCallback(async () => {
    if (!isPaidTier(recruiterTier)) {
      triggerRecruiterPaywall();
      return;
    }

    const tierCfg = TIER_CONFIGS[recruiterTier];
    const filledSlots = bulkSlots.filter((s) => s.resumeText.trim().length > 0);
    if (!jobDescription.trim() || filledSlots.length === 0) {
      setError('Please provide a job spec and at least one candidate resume.');
      return;
    }

    if (tierCfg.recruiterScreeningCap !== Infinity && recruiterScreeningCount + filledSlots.length > tierCfg.recruiterScreeningCap) {
      setError(`You've reached your screening cap of ${tierCfg.recruiterScreeningCap} resumes for your current plan. Upgrade to screen more candidates.`);
      setPricingRole('recruiter');
      setShowPricing(true);
      return;
    }

    setBulkLoading(true);
    setBulkCandidates([]);
    setError(null);

    try {
      const results = await Promise.all(
        filledSlots.map(async (slot) => {
          const res = await analyzeWithGemini(
            '',
            jobTitle || 'the role',
            companyName || 'the company',
            jobDescription,
            slot.resumeText,
          );
          const insights = deriveRecruiterInsights(res, jobTitle, companyName);
          return {
            id: slot.id,
            label: slot.label,
            resumeText: slot.resumeText,
            result: res,
            fitVerdict: insights.fitVerdict,
            fitScore: insights.fitScore,
            strengths: insights.keyStrengths.map((s) => s.split('—')[0].trim()),
            disqualifiers: insights.redFlags.map((f) => f.split('—')[0].trim()),
          } as BulkCandidate;
        }),
      );
      setBulkCandidates(results);
      const newCount = recruiterScreeningCount + results.length;
      setRecruiterScreeningCountLocalStorage(newCount);
      setRecruiterScreeningCount(newCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during bulk screening.');
    } finally {
      setBulkLoading(false);
    }
  }, [bulkSlots, jobDescription, jobTitle, companyName, recruiterTier, recruiterScreeningCount]);

  const handleAnalyze = useCallback(async () => {
    if (mode === 'recruiter' && !isPaidTier(recruiterTier)) {
      triggerRecruiterPaywall();
      return;
    }

    // Free trial limit for job seekers
    if (mode === 'jobseeker' && !isJobSeekerPro && jobSeekerTailorCount >= FREE_TAILOR_LIMIT) {
      setError("You've used your 2 free AI tailors. Upgrade to Pro for unlimited tailoring and outreach.");
      setShowTrialExpiredToast(true);
      setPricingRole('jobseeker');
      setShowPricing(true);
      return;
    }

    setError(null);

    if (!jobDescription.trim() || !resumeText.trim()) {
      setError('Please provide both a job description and your resume text.');
      return;
    }

    // Consume a trial credit if in recruiter trial mode
    if (mode === 'recruiter' && !isPaidTier(recruiterTier) && recruiterTrialCredits > 0) {
      const remaining = recruiterTrialCredits - 1;
      setRecruiterTrialCreditsLocalStorage(remaining);
      setRecruiterTrialCredits(remaining);
      if (remaining === 0) {
        // Will show gate again next time they try
      }
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeWithGemini(
        '',
        jobTitle || 'the role',
        companyName || 'the company',
        jobDescription,
        resumeText,
      );
      setResult(res);

      // Increment free tailor count for job seekers (cloud-synced)
      if (mode === 'jobseeker' && !isJobSeekerPro && profile) {
        const newCount = jobSeekerTailorCount + 1;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ trials_used: newCount })
          .eq('id', profile.id);
        if (!updateError) {
          setJobSeekerTailorCount(newCount);
          setProfile({ ...profile, trials_used: newCount });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobDescription, jobTitle, companyName, resumeText, mode, recruiterTier, recruiterTrialCredits, isJobSeekerPro, jobSeekerTailorCount, profile]);

  const canAnalyze = jobDescription.trim().length > 0 && resumeText.trim().length > 0;
  const filledBulkSlots = bulkSlots.filter((s) => s.resumeText.trim().length > 0).length;
  const canBulkScreen = jobDescription.trim().length > 0 && filledBulkSlots > 0;

  const refreshTrackerCount = () => {
    setTrackerCountJs(loadTracker('jobseeker').length);
    setTrackerCountRec(loadPipeline().length);
  };

  const handleSaveToPipeline = () => {
    const date = new Date().toLocaleDateString();
    const existing = loadPipeline();
    const newEntries: PipelineEntry[] = bulkCandidates.map((c) => ({
      id: `pipe-${Date.now()}-${c.id}`,
      candidateName: c.label,
      jobTitle: jobTitle || 'Unknown Role',
      companyName: companyName || 'Unknown Company',
      matchScore: c.fitScore,
      verdict: c.fitVerdict === 'strong' ? 'Shortlist' : c.fitVerdict === 'moderate' ? 'Review' : 'Reject',
      strengths: c.strengths,
      date,
    }));
    savePipelineEntries([...newEntries, ...existing]);
    refreshTrackerCount();
  };

  const handleJdChange = (val: string) => {
    if (isRecruiterMode && !isPaidTier(recruiterTier) && isDemoMode) {
      triggerRecruiterPaywall();
      return;
    }
    setJobDescription(val);
    if (isRecruiterMode && !isPaidTier(recruiterTier)) {
      setIsDemoMode(false);
      setBulkCandidates([]);
    }
  };

  const handleJobTitleChange = (val: string) => {
    if (isRecruiterMode && !isPaidTier(recruiterTier) && isDemoMode) {
      triggerRecruiterPaywall();
      return;
    }
    setJobTitle(val);
  };

  const handleCompanyChange = (val: string) => {
    if (isRecruiterMode && !isPaidTier(recruiterTier) && isDemoMode) {
      triggerRecruiterPaywall();
      return;
    }
    setCompanyName(val);
  };

  const handleBulkSlotsChange = (slots: ResumeSlot[]) => {
    if (isRecruiterMode && !isPaidTier(recruiterTier) && isDemoMode) {
      triggerRecruiterPaywall();
      return;
    }
    setBulkSlots(slots);
    if (slots.some((s) => s.resumeText.trim().length > 0)) {
      setIsDemoMode(false);
      setBulkCandidates([]);
    }
  };

  const isRecruiterMode = mode === 'recruiter';

  // Auth wall: show loading spinner while checking, AuthGate if not signed in
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-sm text-slate-500">Loading ColdTailor AI...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {isRecruiterMode ? (
          <>
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
            <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
            <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
          </>
        )}
      </div>

      <div className="relative">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all duration-500 ${isRecruiterMode ? 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/20' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20'}`}>
                {isRecruiterMode ? (
                  <Building className="h-5 w-5 text-slate-950" />
                ) : (
                  <Sparkles className="h-5 w-5 text-slate-950" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-50">
                  {isRecruiterMode ? (
                    <>
                      ColdTailor<span className="text-sky-400"> Talent ATS</span>
                    </>
                  ) : (
                    <>
                      ColdTailor<span className="text-amber-400"> AI</span>
                    </>
                  )}
                </h1>
                <p className="hidden text-xs text-slate-400 sm:block">
                  {isRecruiterMode
                    ? 'AI-powered candidate screening & interview toolkit'
                    : 'Tailor your resume & DM founders in seconds'}
                </p>
              </div>
              {/* PRO badge */}
              {isRecruiterMode && isPaidTier(recruiterTier) && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                  <Crown className="h-3 w-3" />
                  {TIER_CONFIGS[recruiterTier].shortLabel}
                  <span className="font-normal opacity-80">
                    Screenings: {recruiterScreeningCount}/{TIER_CONFIGS[recruiterTier].recruiterScreeningCap === Infinity ? 'Unlimited' : TIER_CONFIGS[recruiterTier].recruiterScreeningCap}
                  </span>
                </span>
              )}
              {isRecruiterMode && !isPaidTier(recruiterTier) && recruiterTrialCredits > 0 && (
                <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
                  <ScanSearch className="h-3 w-3" />
                  Trial: {recruiterTrialCredits}/1 Credit
                </span>
              )}
              {!isRecruiterMode && isPaidTier(jobSeekerTier) && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                  <Zap className="h-3 w-3" />
                  {TIER_CONFIGS[jobSeekerTier].shortLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-medium text-slate-400 sm:inline-flex">
                <Zap className={`h-3 w-3 ${isRecruiterMode ? 'text-sky-400' : 'text-amber-400'}`} />
                Powered by Gemini
              </div>
              {/* Log out button */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
              {/* Tracker button with counter badge */}
              <button
                onClick={() => setShowTracker(true)}
                className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
              >
                <KanbanSquare className={`h-4 w-4 ${isRecruiterMode ? 'text-sky-400' : 'text-sky-400'}`} />
                <span className="hidden sm:inline">{isRecruiterMode ? 'Pipeline' : 'My Tracker'}</span>
                <span className="sm:hidden">Tracker</span>
                {trackerCount > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500/20 px-1.5 text-[10px] font-bold text-sky-300 ring-1 ring-sky-500/30">
                    {trackerCount}
                  </span>
                )}
              </button>
              {/* Pro/Upgrade button */}
              {isRecruiterMode ? (
                isPaidTier(recruiterTier) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {TIER_CONFIGS[recruiterTier].label}
                  </span>
                ) : (
                  <button
                    onClick={triggerRecruiterPaywall}
                    className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30 sm:px-4"
                  >
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">Upgrade to Pro</span>
                    <span className="sm:hidden">Upgrade</span>
                  </button>
                )
              ) : isPaidTier(jobSeekerTier) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/15 to-orange-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {TIER_CONFIGS[jobSeekerTier].label}
                </span>
              ) : (
                <button
                  onClick={() => {
                    setPricingRole('jobseeker');
                    setShowPricing(true);
                  }}
                  className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 sm:px-4"
                >
                  <Crown className="h-4 w-4" />
                  <span className="hidden sm:inline">Upgrade to Pro</span>
                  <span className="sm:hidden">Pro</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-center sm:px-6">
          {/* Mode toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center rounded-2xl border border-slate-800 bg-slate-900/60 p-1 backdrop-blur-xl">
              <button
                onClick={() => handleModeSwitch('jobseeker')}
                className={`relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  mode === 'jobseeker'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="h-4 w-4" />
                Job Seeker
              </button>
              <button
                onClick={() => handleModeSwitch('recruiter')}
                className={`relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  mode === 'recruiter'
                    ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                Recruiter / HR
              </button>
            </div>
          </div>

          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-50 sm:text-4xl">
            {mode === 'jobseeker' ? (
              <>
                Land more interviews with a{' '}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  tailored resume
                </span>{' '}
                &amp; cold DM
              </>
            ) : (
              <>
                Screen candidates{' '}
                <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                  in seconds
                </span>{' '}
                with AI-powered fit analysis
              </>
            )}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            {mode === 'jobseeker'
              ? 'Paste a job description, drop your resume, and get an ATS match score, missing keywords, tailored bullets, and a cold DM - in seconds.'
              : 'Upload a job spec and a candidate resume to get an instant hire verdict, interview script, and automated email templates.'}
          </p>

          {/* Trust stats row */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <UsersIcon className="h-4 w-4 text-sky-400/70" />
              <span><span className="font-semibold text-slate-300">12,400+</span> Resumes Optimized</span>
            </div>
            <div className="hidden h-4 w-px bg-slate-800 sm:block" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400/70" />
              <span><span className="font-semibold text-slate-300">88%</span> Avg ATS Match</span>
            </div>
            <div className="hidden h-4 w-px bg-slate-800 sm:block" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-slate-300" />
              <span><span className="font-semibold text-slate-300">100%</span> Client-Side Privacy</span>
            </div>
            <div className="hidden h-4 w-px bg-slate-800 sm:block" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Star className="h-4 w-4 text-amber-400/70" />
              <span><span className="font-semibold text-slate-300">4.9/5</span> User Rating</span>
            </div>
          </div>
        </section>

        {/* Main content */}
        <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          {/* Recruiter demo sandbox banner */}
          {isRecruiterMode && !isPaidTier(recruiterTier) && (
            <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Eye className="h-4 w-4 text-sky-400" />
                <span>
                  Recruiter Demo Sandbox: Reviewing sample candidate evaluations.
                </span>
              </div>
              <button
                onClick={triggerRecruiterPaywall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:shadow-sky-500/30"
              >
                <Crown className="h-3.5 w-3.5" />
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* Recruiter trial exhausted banner (only for trial users who used their credit) */}
          {isRecruiterMode && !isPaidTier(recruiterTier) && recruiterTrialCredits === 0 && !isDemoMode && bulkCandidates.length === 0 && (
            <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Lock className="h-4 w-4 text-amber-400" />
                Your 1 free screening is used up. Upgrade for unlimited candidate screening.
              </div>
              <button
                onClick={triggerRecruiterPaywall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:shadow-sky-500/30"
              >
                <Crown className="h-3.5 w-3.5" />
                Unlock Recruiter Pro
              </button>
            </div>
          )}

          {/* Input workspace */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Left: Job Spec / Description */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${isRecruiterMode ? 'bg-sky-500/10 ring-sky-500/20' : 'bg-sky-500/10 ring-sky-500/20'}`}>
                  <Briefcase className="h-4 w-4 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {isRecruiterMode ? 'Job Spec / Requirements' : 'Job Description'}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      {isRecruiterMode ? 'Role Title' : 'Job Title'}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => isRecruiterMode ? handleJobTitleChange(e.target.value) : setJobTitle(e.target.value)}
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => isRecruiterMode ? handleCompanyChange(e.target.value) : setCompanyName(e.target.value)}
                        placeholder="e.g. Vercel"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      {isRecruiterMode ? 'Job Spec / Requirements Text' : 'Job Description Text'}
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-sky-400">
                      <Upload className="h-3.5 w-3.5" />
                      Upload .txt
                      <input
                        type="file"
                        accept=".txt,.md,.text"
                        onChange={handleJDFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => isRecruiterMode ? handleJdChange(e.target.value) : setJobDescription(e.target.value)}
                    placeholder={isRecruiterMode ? 'Paste the job spec, requirements, and must-have skills here...' : 'Paste the full job description here...'}
                    rows={10}
                    className="scrollbar-thin w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm leading-relaxed text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Right: Resume(s) */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  {isRecruiterMode ? <UsersRound className="h-4 w-4 text-emerald-400" /> : <User className="h-4 w-4 text-emerald-400" />}
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {isRecruiterMode ? 'Candidate Resumes (Bulk)' : 'Your Resume'}
                </h3>
              </div>

              {isRecruiterMode ? (
                <BulkResumeInput
                  slots={bulkSlots}
                  onSlotsChange={handleBulkSlotsChange}
                  isRecruiterPro={isPaidTier(recruiterTier)}
                  recruiterTier={recruiterTier}
                  onPaywall={triggerRecruiterPaywall}
                />
              ) : (
                <DragDropResume resumeText={resumeText} onTextChange={setResumeText} />
              )}
            </div>
          </div>

          {/* Free trial credit pill — job seeker non-pro only */}
          {!isRecruiterMode && !isJobSeekerPro && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => {
                  setPricingRole('jobseeker');
                  setShowPricing(true);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-105 ${
                  trialExpired
                    ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
                    : tailorsRemaining === 1
                      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25'
                }`}
              >
                {trialExpired ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Trial Expired (0/{FREE_TAILOR_LIMIT} left) — Upgrade to Pro
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Free Trial: {tailorsRemaining}/{FREE_TAILOR_LIMIT} credits left
                  </>
                )}
              </button>
            </div>
          )}
          {/* Pro Unlimited badge — job seeker pro only */}
          {!isRecruiterMode && isJobSeekerPro && (
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/15 to-orange-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
                <Zap className="h-3.5 w-3.5" />
                Pro Unlimited
              </span>
            </div>
          )}

          {/* Action bar */}
          <div className="mt-5 flex justify-center">
            {isRecruiterMode && !isPaidTier(recruiterTier) ? (
              <button
                onClick={triggerRecruiterPaywall}
                className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30 sm:w-auto"
              >
                <Lock className="h-5 w-5" />
                Screen Your Own Candidates
                <Crown className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={isRecruiterMode ? handleBulkScreen : handleAnalyze}
                disabled={isRecruiterMode ? (bulkLoading || !canBulkScreen) : (loading || !canAnalyze)}
                className={`group relative inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${isRecruiterMode ? 'bg-gradient-to-r from-sky-400 to-blue-500 shadow-sky-500/20 hover:shadow-sky-500/30' : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/20 hover:shadow-amber-500/30'}`}
              >
                {isRecruiterMode ? (
                  bulkLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Screening {filledBulkSlots} candidates...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      Screen {filledBulkSlots > 0 ? `${filledBulkSlots} Candidate${filledBulkSlots > 1 ? 's' : ''}` : 'Candidates'} with AI
                    </>
                  )
                ) : loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Analyze & Tailor with AI
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {(canAnalyze || canBulkScreen) && (
                  <button
                    onClick={isRecruiterMode ? handleBulkScreen : handleAnalyze}
                    disabled={isRecruiterMode ? bulkLoading : loading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {(loading || bulkLoading) && (
            <div className="mt-5 space-y-4 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-6 backdrop-blur-xl">
              <div className="h-8 w-48 animate-shimmer rounded-lg" />
              <div className="h-32 w-32 mx-auto animate-shimmer rounded-full" />
              <div className="h-4 w-full animate-shimmer rounded" />
              <div className="h-4 w-2/3 animate-shimmer rounded" />
            </div>
          )}

          {/* Output: Job Seeker */}
          {result && !loading && !isRecruiterMode && (
            <div className="mt-5 animate-fade-in-up">
              <OutputDashboard
                result={result}
                jobTitle={jobTitle}
                companyName={companyName}
                isPro={isPaidTier(jobSeekerTier)}
                tier={jobSeekerTier}
                onOpenPricing={() => {
                  setPricingRole('jobseeker');
                  setShowPricing(true);
                }}
                onTrackerUpdate={refreshTrackerCount}
                mode={mode}
              />
            </div>
          )}

          {/* Output: Recruiter Leaderboard */}
          {bulkCandidates.length > 0 && !bulkLoading && isRecruiterMode && (
            <div className="mt-5 animate-fade-in-up rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5 backdrop-blur-xl shadow-2xl shadow-black/30 sm:p-6">
              {isDemoMode && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
                  <Eye className="h-3.5 w-3.5" />
                  Sample evaluation data - upgrade to screen your own candidates.
                </div>
              )}
              <CandidateLeaderboard
                candidates={bulkCandidates}
                jobTitle={jobTitle}
                companyName={companyName}
                isRecruiterPro={isPaidTier(recruiterTier)}
                onOpenPricing={triggerRecruiterPaywall}
                onSaveToPipeline={isPaidTier(recruiterTier) ? handleSaveToPipeline : triggerRecruiterPaywall}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 py-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-xs text-slate-500">
              {isRecruiterMode
                ? 'ColdTailor Talent ATS - AI-powered candidate screening for modern teams.'
                : 'ColdTailor AI - Tailor your resume & land more interviews.'}
            </p>
          </div>
        </footer>
      </div>

      <PricingModalBoundary onClose={() => setShowPricing(false)}>
      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        initialRole={pricingRole}
        onUpgradeJobSeeker={async (tier: Tier) => {
          setJobSeekerTierLocalStorage(tier);
          setJobSeekerTier(tier);
          if (profile) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ is_pro: true, tier })
              .eq('id', profile.id);
            if (!updateError) {
              setProfile({ ...profile, is_pro: true, tier });
            }
          }
        }}
        onUpgradeRecruiter={async (tier: Tier) => {
          setRecruiterTierLocalStorage(tier);
          setRecruiterTier(tier);
          if (profile) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ is_pro: true, tier })
              .eq('id', profile.id);
            if (!updateError) {
              setProfile({ ...profile, is_pro: true, tier });
            }
          }
        }}
      />
      </PricingModalBoundary>

      <TrackerDrawer
        isOpen={showTracker}
        onClose={() => setShowTracker(false)}
        onOpenPricing={() => {
          setPricingRole(mode === 'recruiter' ? 'recruiter' : 'jobseeker');
          setShowPricing(true);
        }}
        isPro={isPaidTier(jobSeekerTier)}
        tier={mode === 'recruiter' ? recruiterTier : jobSeekerTier}
        mode={mode}
      />

      <RecruiterGateModal
        isOpen={showRecruiterGate}
        onClose={handleRecruiterGateClose}
        onGetPass={() => {
          setShowRecruiterGate(false);
          setPricingRole('recruiter');
          setShowPricing(true);
        }}
        onTrialActivated={handleTrialActivated}
      />
      <SocialProofToast />

      {/* Trial expired toast */}
      {showTrialExpiredToast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2">
          <div className="animate-toast-in inline-flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-xl">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-100">You've used your 2 free AI tailors. Upgrade to Pro for unlimited tailoring and outreach.</span>
            <button
              onClick={() => setShowTrialExpiredToast(false)}
              className="ml-2 rounded p-0.5 text-slate-500 transition hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
