import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Gauge,
  Tag,
  ListChecks,
  MessageSquareText,
  Copy,
  Check,
  Download,
  Linkedin,
  Mail,
  Clock,
  Lock,
  Crown,
  FileDown,
  X,
  Bookmark,
  ClipboardCheck,
  Phone,
  ThumbsUp,
  AlertTriangle,
  CircleCheck,
  CircleX,
  Users,
  Send,
  Share2,
  Twitter,
} from 'lucide-react';
import type { AnalysisResult, AppMode, RecruiterResult, Tier } from '@/types';
import { deriveRecruiterInsights, isPaidTier } from '@/types';
import { AtsScoreMeter } from './AtsScoreMeter';
import { generateReportMarkdown, downloadFile } from '@/lib/exportReport';
import { canSaveMore, addTrackerEntry, type TrackerEntry } from './TrackerDrawer';

interface OutputDashboardProps {
  result: AnalysisResult;
  jobTitle: string;
  companyName: string;
  isPro: boolean;
  tier: Tier;
  onOpenPricing: () => void;
  onTrackerUpdate: () => void;
  mode: AppMode;
}

type TabId = 'score' | 'keywords' | 'bullets' | 'outreach';
type OutreachTab = 'linkedin' | 'email' | 'followup';
type RecruiterTabId = 'verdict' | 'phonescreen' | 'candidateemail';
type EmailVariant = 'shortlist' | 'rejection';

const tabs: { id: TabId; label: string; icon: typeof Gauge }[] = [
  { id: 'score', label: 'ATS Score', icon: Gauge },
  { id: 'keywords', label: 'Missing Keywords', icon: Tag },
  { id: 'bullets', label: 'Tailored Bullets', icon: ListChecks },
  { id: 'outreach', label: 'Outreach', icon: MessageSquareText },
];

const recruiterTabs: { id: RecruiterTabId; label: string; icon: typeof ClipboardCheck }[] = [
  { id: 'verdict', label: 'Quick Fit Verdict', icon: ClipboardCheck },
  { id: 'phonescreen', label: 'Interview Script', icon: Phone },
  { id: 'candidateemail', label: 'Candidate Email', icon: Mail },
];

const outreachTabs: { id: OutreachTab; label: string; icon: typeof Linkedin; isPro: boolean }[] = [
  { id: 'linkedin', label: 'LinkedIn Note', icon: Linkedin, isPro: false },
  { id: 'email', label: 'Cold Email', icon: Mail, isPro: false },
  { id: 'followup', label: 'Follow-Up (Day 4)', icon: Clock, isPro: true },
];

const EXPORT_COUNT_KEY = 'coldtailor_export_count';
const FREE_EXPORT_LIMIT = 1;

function getExportCount(): number {
  try {
    return parseInt(localStorage.getItem(EXPORT_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementExportCount(): number {
  const next = getExportCount() + 1;
  try {
    localStorage.setItem(EXPORT_COUNT_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

function PaywallCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-slate-950/40 p-6 backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 ring-1 ring-amber-500/30">
          <Lock className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-100">
            Unlock Follow-Up Sequences with Pro
          </h4>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            Send perfectly timed follow-up nudges that get replies without being pushy. Part of
            the Multi-Platform Outreach Engine.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

function CharCounter({ text, max }: { text: string; max: number }) {
  const count = text.length;
  const isOver = count > max;
  const isNear = count > max - 30 && !isOver;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        isOver ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-slate-500'
      }`}
    >
      {count}/{max} chars
    </span>
  );
}

function PrintableResume({
  result,
  jobTitle,
  companyName,
}: {
  result: AnalysisResult;
  jobTitle: string;
  companyName: string;
}) {
  const role = jobTitle.trim() || 'Software Engineer';
  const comp = companyName.trim() || '';
  const competencies = [...result.missingKeywords, ...result.tailoredBullets.flatMap((b) =>
    b.match(/using\s+(.+?),/)?.[1]?.split(',').map((s) => s.trim().toUpperCase()) ?? []
  )].slice(0, 12);

  return (
    <div id="coldtailor-print-root" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
      <div style={{ color: '#111', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: '10px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {role}
          </h1>
          <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0' }}>
            Tailored for {comp || 'your target company'} &middot; Generated by ColdTailor AI
          </p>
        </div>

        {/* Professional Summary */}
        <section style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#333', marginBottom: '6px' }}>
            Professional Summary
          </h2>
          <p style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#222', margin: 0 }}>
            Results-driven {role} with proven expertise in building performant, scalable
            applications{comp ? ` and a strong interest in contributing to ${comp}` : ''}.
            Demonstrated ability to optimize systems, collaborate cross-functionally, and deliver
            production-ready solutions under tight deadlines. Adept at leveraging modern tooling
            and best practices to drive measurable impact.
          </p>
        </section>

        {/* Core Competencies */}
        <section style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#333', marginBottom: '6px' }}>
            Core Competencies
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {competencies.map((skill, i) => (
              <span key={i} style={{ fontSize: '12px', color: '#222' }}>
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Tailored Experience */}
        <section>
          <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#333', marginBottom: '8px' }}>
            Tailored Experience &amp; Key Achievements
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {result.tailoredBullets.map((bullet, i) => (
              <li key={i} style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#222', marginBottom: '8px', paddingLeft: '14px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: 0 }}>•</span>
                {bullet}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ShareScorecard({ score, jobTitle }: { score: number; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const role = jobTitle.trim() || 'the role';
  const summary = `My Resume ATS Score: ${score}% for ${role} | Boosted with ColdTailor AI`;
  const appUrl = 'https://coldtailor.ai';
  const shareText = `${summary} — Try it free: ${appUrl}`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}&summary=${encodeURIComponent(shareText)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/20"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share Scorecard
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl animate-fade-in-up">
            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-300" />
                )}
              </span>
              {copied ? 'Summary Copied!' : 'Copy Summary Badge'}
            </button>

            <div className="my-1 h-px bg-slate-800" />

            {/* LinkedIn */}
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15">
                <Linkedin className="h-4 w-4 text-sky-400" />
              </span>
              Share on LinkedIn
            </a>

            {/* X / Twitter */}
            <a
              href={xUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700/50">
                <Twitter className="h-4 w-4 text-slate-200" />
              </span>
              Share on X
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2">
      <div className="animate-toast-in inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-xl">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-slate-100">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded p-0.5 text-slate-500 transition hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function RecruiterVerdictTab({ result }: { result: RecruiterResult }) {
  const verdictConfig = {
    strong: { label: 'Strong Hire', color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', border: 'border-emerald-500/30', icon: CircleCheck, glow: 'bg-emerald-500/10' },
    moderate: { label: 'Review', color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', border: 'border-amber-500/30', icon: AlertTriangle, glow: 'bg-amber-500/10' },
    weak: { label: 'Reject', color: 'text-red-400', bg: 'bg-red-500/15', ring: 'ring-red-500/30', border: 'border-red-500/30', icon: CircleX, glow: 'bg-red-500/10' },
  };
  const cfg = verdictConfig[result.fitVerdict];
  const VerdictIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Hire Verdict card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
        <div className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full ${cfg.glow} blur-3xl`} />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${cfg.bg} ring-1 ${cfg.ring}`}>
              <VerdictIcon className={`h-8 w-8 ${cfg.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hire Verdict</p>
              <div className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</div>
              <div className="mt-0.5 text-sm text-slate-400">
                ATS Match Score: <span className="font-bold tabular-nums text-slate-200">{result.fitScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${result.fitVerdict === 'strong' ? 'bg-emerald-400' : result.fitVerdict === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${result.fitScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Strengths */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-200">Key Strengths</h4>
        </div>
        <div className="space-y-2">
          {result.keyStrengths.map((strength, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3.5 text-sm leading-relaxed text-slate-200"
              style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
            >
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-xs font-bold text-emerald-400">
                {i + 1}
              </span>
              {strength}
            </div>
          ))}
        </div>
      </div>

      {/* Disqualifiers */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-semibold text-slate-200">Disqualifiers</h4>
        </div>
        <div className="space-y-2">
          {result.redFlags.map((flag, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3.5 text-sm leading-relaxed text-slate-200"
              style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              {flag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecruiterPhoneScreenTab({ result }: { result: RecruiterResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Tailored interview questions for this specific candidate with expected talking points.
        </p>
      </div>
      <div className="space-y-4">
        {result.interviewQuestions.map((q, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 transition hover:border-slate-700"
            style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.1}s both` }}
          >
            <div className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-xs font-bold text-sky-400">
                Q{i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed text-slate-100">{q.question}</p>
              </div>
            </div>
            <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expected Talking Points</p>
              <p className="text-xs leading-relaxed text-slate-400">{q.expectedPoints}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecruiterEmailTab({
  result,
  emailVariant,
  setEmailVariant,
}: {
  result: RecruiterResult;
  emailVariant: EmailVariant;
  setEmailVariant: (v: EmailVariant) => void;
}) {
  const email = emailVariant === 'shortlist' ? result.shortlistEmail : result.rejectionEmail;
  const emailText = `Subject: ${email.subject}\n\n${email.body}`;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-1.5">
        <button
          onClick={() => setEmailVariant('shortlist')}
          className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
            emailVariant === 'shortlist'
              ? 'bg-emerald-500/15 text-emerald-300 shadow-sm ring-1 ring-emerald-500/20'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          Shortlist Email
        </button>
        <button
          onClick={() => setEmailVariant('rejection')}
          className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
            emailVariant === 'rejection'
              ? 'bg-red-500/15 text-red-300 shadow-sm ring-1 ring-red-500/20'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <CircleX className="h-4 w-4" />
          Rejection Email
        </button>
      </div>

      <div key={emailVariant} className="space-y-3 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {emailVariant === 'shortlist'
              ? '1-click shortlist email with next-step invite and constructive framing.'
              : 'Polite rejection with specific, actionable feedback for the candidate.'}
          </p>
          <CopyButton
            text={emailText}
            label="Copy Email"
          />
        </div>
        <div className={`rounded-xl border p-5 ${emailVariant === 'shortlist' ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-red-500/15 bg-red-500/5'}`}>
          <div className="mb-3 border-b border-slate-800 pb-3">
            <span className="text-xs font-medium text-slate-500">Subject:</span>
            <p className="mt-1 text-sm font-semibold text-slate-100">{email.subject}</p>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{email.body}</p>
        </div>
      </div>
    </div>
  );
}

export function OutputDashboard({ result, jobTitle, companyName, isPro, tier, onOpenPricing, onTrackerUpdate, mode }: OutputDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('score');
  const [outreachTab, setOutreachTab] = useState<OutreachTab>('linkedin');
  const [recruiterTab, setRecruiterTab] = useState<RecruiterTabId>('verdict');
  const [emailVariant, setEmailVariant] = useState<EmailVariant>('shortlist');
  const [exportCount, setExportCount] = useState(() => getExportCount());
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Resume PDF ready!');
  const [printVisible, setPrintVisible] = useState(false);
  const [savedToTracker, setSavedToTracker] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recruiterResult: RecruiterResult = deriveRecruiterInsights(result, jobTitle, companyName);
  const isRecruiter = mode === 'recruiter';

  const freeExportsLeft = Math.max(FREE_EXPORT_LIMIT - exportCount, 0);
  const canExport = isPro || freeExportsLeft > 0;

  const handleExport = () => {
    const md = generateReportMarkdown(result, jobTitle, companyName);
    const safeName = (companyName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(`coldtailor-report-${safeName}.md`, md, 'text/markdown');
  };

  const handleExportTxt = () => {
    const md = generateReportMarkdown(result, jobTitle, companyName);
    const safeName = (companyName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(`coldtailor-report-${safeName}.txt`, md, 'text/plain');
  };

  const showToastMessage = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3500);
  }, []);

  const handleSaveApplication = useCallback(() => {
    if (savedToTracker) return;
    if (!canSaveMore(tier, mode)) {
      onOpenPricing();
      return;
    }
    const entry: TrackerEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      companyName: companyName || 'Unknown Company',
      jobTitle: jobTitle || 'Software Engineer',
      atsScore: result.atsScore,
      date: new Date().toLocaleDateString(),
      status: 'Saved',
      result,
    };
    addTrackerEntry(entry, mode);
    setSavedToTracker(true);
    onTrackerUpdate();
    showToastMessage('Application saved to tracker!');
  }, [savedToTracker, tier, onOpenPricing, companyName, jobTitle, result, onTrackerUpdate, showToastMessage, mode]);

  const handlePdfExport = useCallback(() => {
    if (!canExport) {
      onOpenPricing();
      return;
    }

    if (!isPro) {
      const newCount = incrementExportCount();
      setExportCount(newCount);
    }

    setPrintVisible(true);

    setTimeout(() => {
      window.print();
      setPrintVisible(false);
      showToastMessage('Resume PDF ready!');
    }, 200);
  }, [canExport, isPro, onOpenPricing, showToastMessage]);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-black/30">
      {/* Tab bar + export */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-2">
        <div className="flex flex-wrap gap-1">
          {isRecruiter ? (
            recruiterTabs.map((tab) => {
              const Icon = tab.icon;
              const active = recruiterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRecruiterTab(tab.id)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-sky-400/0 via-sky-400 to-sky-400/0" />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })
          ) : (
            tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0" />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1.5 px-1">
          {/* Save Application */}
          <button
            onClick={handleSaveApplication}
            disabled={savedToTracker}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
              savedToTracker
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : isRecruiter
                  ? 'border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                  : 'border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
            }`}
          >
            {savedToTracker ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isRecruiter ? 'Save Candidate' : 'Save Application'}</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>

          {/* Primary: Download Tailored PDF */}
          {!isRecruiter && (
            <button
              onClick={handlePdfExport}
              className="group relative inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download Tailored PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          )}
          {/* Badge */}
          {!isRecruiter && (isPro ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
              <Lock className="h-2.5 w-2.5" />
              Pro
            </span>
          ) : freeExportsLeft > 0 ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
              1 Free Export
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
              <Lock className="h-2.5 w-2.5" />
              Pro
            </span>
          ))}

          {/* Secondary: .md / .txt */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.md</span>
            <span className="sm:hidden">MD</span>
          </button>
          <button
            onClick={handleExportTxt}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.txt</span>
            <span className="sm:hidden">TXT</span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        <div key={isRecruiter ? recruiterTab : activeTab} className="animate-fade-in-up">
          {/* ===== RECRUITER MODE ===== */}
          {isRecruiter && recruiterTab === 'verdict' && (
            <RecruiterVerdictTab result={recruiterResult} />
          )}
          {isRecruiter && recruiterTab === 'phonescreen' && (
            <RecruiterPhoneScreenTab result={recruiterResult} />
          )}
          {isRecruiter && recruiterTab === 'candidateemail' && (
            <RecruiterEmailTab
              result={recruiterResult}
              emailVariant={emailVariant}
              setEmailVariant={setEmailVariant}
            />
          )}

          {/* ===== JOB SEEKER MODE ===== */}
          {!isRecruiter && activeTab === 'score' && (
            <div className="flex flex-col items-center gap-6 py-4">
              <AtsScoreMeter score={result.atsScore} />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <p className="max-w-md text-center text-sm text-slate-400">
                  This score estimates how well your resume aligns with the job description based on
                  keyword overlap, experience relevance, and skill coverage.
                </p>
              </div>
              <ShareScorecard score={result.atsScore} jobTitle={jobTitle} />
            </div>
          )}

          {!isRecruiter && activeTab === 'keywords' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Skills in the JD but missing from your resume. Add the ones you genuinely have.
                </p>
                {result.missingKeywords.length > 0 && (
                  <CopyButton text={result.missingKeywords.join(', ')} label="Copy All" />
                )}
              </div>
              {result.missingKeywords.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No critical keywords missing - your resume covers the bases.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((kw, i) => (
                    <span
                      key={kw + i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300"
                      style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isRecruiter && activeTab === 'bullets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Impact-driven, quantifiable resume bullets tailored for this specific role.
                </p>
                {result.tailoredBullets.length > 0 && (
                  <CopyButton
                    text={result.tailoredBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}
                    label="Copy All"
                  />
                )}
              </div>
              <ul className="space-y-3">
                {result.tailoredBullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="group flex gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 transition hover:border-slate-700"
                    style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-xs font-bold text-emerald-400">
                      {i + 1}
                    </span>
                    <span className="flex-1">{bullet}</span>
                    <span className="opacity-0 transition group-hover:opacity-100">
                      <CopyButton text={bullet} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isRecruiter && activeTab === 'outreach' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-1.5">
                {outreachTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = outreachTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setOutreachTab(tab.id)}
                      className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                        active
                          ? 'bg-slate-800 text-slate-100 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden xs:inline sm:inline">{tab.label}</span>
                      {tab.isPro && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
                          <Lock className="h-2.5 w-2.5" />
                          Pro
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div key={outreachTab} className="animate-fade-in-up">
                {outreachTab === 'linkedin' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        Punchy LinkedIn connection note - stays under the 300-character limit.
                      </p>
                      <div className="flex items-center gap-3">
                        <CharCounter text={result.linkedInNote} max={300} />
                        <CopyButton text={result.linkedInNote} label="Copy" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                      <p className="text-sm leading-relaxed text-slate-200">
                        {result.linkedInNote}
                      </p>
                    </div>
                  </div>
                )}

                {outreachTab === 'email' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        Formatted cold email with subject line and a concise 3-paragraph pitch.
                      </p>
                      <CopyButton
                        text={`Subject: ${result.coldEmail.subject}\n\n${result.coldEmail.body}`}
                        label="Copy Email"
                      />
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                      <div className="mb-3 border-b border-slate-800 pb-3">
                        <span className="text-xs font-medium text-slate-500">Subject:</span>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {result.coldEmail.subject}
                        </p>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                        {result.coldEmail.body}
                      </p>
                    </div>
                  </div>
                )}

                {outreachTab === 'followup' && (
                  isPro ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                          Subtle, polite Day-4 nudge for recruiters who haven't replied yet.
                        </p>
                        <CopyButton text={result.followUpNote} label="Copy" />
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                        <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-3">
                          <Clock className="h-4 w-4 text-amber-400" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                            Day 4 Follow-Up
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                          {result.followUpNote}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <PaywallCard onUpgrade={onOpenPricing} />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable resume — rendered in a portal, visible only during print */}
      {printVisible && createPortal(
        <PrintableResume result={result} jobTitle={jobTitle} companyName={companyName} />,
        document.body,
      )}

      {/* Toast */}
      {showToast && <Toast message={toastMsg} onClose={() => setShowToast(false)} />}
    </div>
  );
}
