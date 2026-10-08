import { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Briefcase,
  Calendar,
  ChevronDown,
  KanbanSquare,
  Eye,
  CheckCircle2,
  Send,
  FileText,
  Clock,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import type { AnalysisResult, Tier } from '@/types';
import { TIER_CONFIGS, isPaidTier } from '@/types';

export type AppStatus = 'Saved' | 'Applied' | 'DM Sent' | 'Interview';

export interface TrackerEntry {
  id: string;
  companyName: string;
  jobTitle: string;
  atsScore: number;
  date: string;
  status: AppStatus;
  result: AnalysisResult;
}

export interface PipelineEntry {
  id: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  verdict: 'Shortlist' | 'Review' | 'Reject';
  strengths: string[];
  date: string;
}

interface TrackerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
  isPro: boolean;
  tier: Tier;
  mode: 'jobseeker' | 'recruiter';
}

const STORAGE_KEY_JS = 'coldtailor_tracker';
const STORAGE_KEY_REC = 'coldtailor_recruiter_tracker';
const PIPELINE_KEY = 'recruiter_pipeline';
const FREE_LIMIT = 2;

function getStorageKey(mode: 'jobseeker' | 'recruiter'): string {
  return mode === 'recruiter' ? STORAGE_KEY_REC : STORAGE_KEY_JS;
}

const statusConfig: Record<AppStatus, { color: string; bg: string; ring: string; icon: typeof CheckCircle2 }> = {
  Saved: { color: 'text-slate-300', bg: 'bg-slate-500/15', ring: 'ring-slate-500/20', icon: FileText },
  Applied: { color: 'text-sky-400', bg: 'bg-sky-500/15', ring: 'ring-sky-500/20', icon: Send },
  'DM Sent': { color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/20', icon: Clock },
  Interview: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/20', icon: CheckCircle2 },
};

const statusOrder: AppStatus[] = ['Saved', 'Applied', 'DM Sent', 'Interview'];

const verdictConfig: Record<PipelineEntry['verdict'], { color: string; bg: string; ring: string; icon: typeof CheckCircle2 }> = {
  Shortlist: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', icon: CheckCircle2 },
  Review: { color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', icon: AlertTriangle },
  Reject: { color: 'text-red-400', bg: 'bg-red-500/15', ring: 'ring-red-500/30', icon: X },
};

export function loadTracker(mode: 'jobseeker' | 'recruiter' = 'jobseeker'): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(getStorageKey(mode));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTracker(entries: TrackerEntry[], mode: 'jobseeker' | 'recruiter' = 'jobseeker'): void {
  try {
    localStorage.setItem(getStorageKey(mode), JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function canSaveMore(tier: Tier, mode: 'jobseeker' | 'recruiter' = 'jobseeker'): boolean {
  const cfg = TIER_CONFIGS[tier];
  if (mode === 'recruiter') return isPaidTier(tier);
  return loadTracker(mode).length < cfg.jobSeekerAppCap;
}

export function addTrackerEntry(entry: TrackerEntry, mode: 'jobseeker' | 'recruiter' = 'jobseeker'): boolean {
  const entries = loadTracker(mode);
  entries.unshift(entry);
  saveTracker(entries, mode);
  return true;
}

export function deleteTrackerEntry(id: string, mode: 'jobseeker' | 'recruiter' = 'jobseeker'): void {
  const entries = loadTracker(mode).filter((e) => e.id !== id);
  saveTracker(entries, mode);
}

export function updateTrackerStatus(id: string, status: AppStatus, mode: 'jobseeker' | 'recruiter' = 'jobseeker'): void {
  const entries = loadTracker(mode).map((e) => (e.id === id ? { ...e, status } : e));
  saveTracker(entries, mode);
}

export function loadPipeline(): PipelineEntry[] {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePipelineEntries(entries: PipelineEntry[]): void {
  try {
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function deletePipelineEntry(id: string): void {
  const entries = loadPipeline().filter((e) => e.id !== id);
  savePipelineEntries(entries);
}

export function TrackerDrawer({ isOpen, onClose, onOpenPricing, isPro, tier, mode }: TrackerDrawerProps) {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [pipelineEntries, setPipelineEntries] = useState<PipelineEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEntries(loadTracker(mode));
      setPipelineEntries(loadPipeline());
    }
  }, [isOpen, mode]);

  const handleDelete = (id: string) => {
    deleteTrackerEntry(id, mode);
    setEntries(loadTracker(mode));
  };

  const handleStatusChange = (id: string, status: AppStatus) => {
    updateTrackerStatus(id, status, mode);
    setEntries(loadTracker(mode));
  };

  const handleDeletePipeline = (id: string) => {
    deletePipelineEntry(id);
    setPipelineEntries(loadPipeline());
  };

  if (!isOpen) return null;

  const isRecruiter = mode === 'recruiter';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm animate-fade-in-up"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[95] flex h-full w-full max-w-md flex-col border-l border-slate-700/60 bg-slate-900/95 backdrop-blur-2xl shadow-2xl animate-fade-in-up">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <KanbanSquare className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {isRecruiter ? 'Candidate Pipeline' : 'My Tracker'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRecruiter
                  ? `${pipelineEntries.length} saved candidate${pipelineEntries.length !== 1 ? 's' : ''}`
                  : `${entries.length} saved ${entries.length === 1 ? 'application' : 'applications'}${tier === 'free' ? ` · ${Math.max(TIER_CONFIGS.free.jobSeekerAppCap - entries.length, 0)} free slots left` : tier === '3months' ? ` · ${Math.max(TIER_CONFIGS['3months'].jobSeekerAppCap - entries.length, 0)}/${TIER_CONFIGS['3months'].jobSeekerAppCap} remaining` : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto scrollbar-thin p-4">
          {/* Recruiter Pipeline View */}
          {isRecruiter ? (
            pipelineEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 ring-1 ring-slate-700">
                  <Briefcase className="h-7 w-7 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">
                  No candidates saved yet. Screen resumes in bulk and hit "Save to Hiring Pipeline" to start tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineEntries.map((entry, idx) => {
                  const vcfg = verdictConfig[entry.verdict];
                  const VIcon = vcfg.icon;
                  const expanded = expandedId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 transition hover:border-slate-700"
                      style={{ animation: 'fadeInUp 0.3s ease-out both' }}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${idx === 0 ? 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300 ring-1 ring-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {idx === 0 ? <Trophy className="h-4 w-4" /> : `#${idx + 1}`}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-100">{entry.candidateName}</h4>
                            <span className={`inline-flex items-center gap-1 rounded-full ${vcfg.bg} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${vcfg.color} ring-1 ${vcfg.ring}`}>
                              <VIcon className="h-2.5 w-2.5" />
                              {entry.verdict}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">{entry.jobTitle} at {entry.companyName}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {entry.date}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Match: {entry.matchScore}/100
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePipeline(entry.id)}
                          className="rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-800/60 px-4 py-2.5">
                        <button
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {expanded ? 'Hide' : 'Review Details'}
                        </button>
                      </div>

                      {expanded && (
                        <div className="border-t border-slate-800/60 p-4 animate-fade-in-up">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Key Strengths</p>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.strengths.map((s, i) => (
                              <span key={i} className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Job Seeker Tracker View */
            entries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 ring-1 ring-slate-700">
                  <Briefcase className="h-7 w-7 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">
                  No applications saved yet. Run an analysis and hit "Save Application" to start tracking your job hunt.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const status = statusConfig[entry.status];
                  const StatusIcon = status.icon;
                  const expanded = expandedId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 transition hover:border-slate-700"
                      style={{ animation: 'fadeInUp 0.3s ease-out both' }}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-100">
                              {entry.companyName || 'Unknown Company'}
                            </h4>
                            <span className={`inline-flex items-center gap-1 rounded-full ${status.bg} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.color} ring-1 ${status.ring}`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {entry.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">{entry.jobTitle}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {entry.date}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              ATS: {entry.atsScore}/100
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-800/60 px-4 py-2.5">
                        <div className="relative">
                          <select
                            value={entry.status}
                            onChange={(e) => handleStatusChange(entry.id, e.target.value as AppStatus)}
                            className="appearance-none rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 pl-3 pr-8 text-xs font-medium text-slate-300 outline-none transition hover:border-slate-600 focus:border-sky-500/50"
                          >
                            {statusOrder.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        </div>
                        <button
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {expanded ? 'Hide' : 'View'}
                        </button>
                      </div>

                      {expanded && (
                        <div className="space-y-3 border-t border-slate-800/60 p-4 animate-fade-in-up">
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tailored Bullets</p>
                            <ul className="space-y-1.5">
                              {entry.result.tailoredBullets.map((b, i) => (
                                <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-emerald-500/15 text-[10px] font-bold text-emerald-400">{i + 1}</span>
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">LinkedIn Note</p>
                            <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-xs leading-relaxed text-slate-300">
                              {entry.result.linkedInNote}
                            </p>
                          </div>
                          {entry.result.missingKeywords.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Missing Keywords</p>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.result.missingKeywords.map((kw, i) => (
                                  <span key={i} className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {tier === 'free' && entries.length >= TIER_CONFIGS.free.jobSeekerAppCap && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      You've used all {TIER_CONFIGS.free.jobSeekerAppCap} free tracker slots.
                    </p>
                    <button
                      onClick={onOpenPricing}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-xl hover:shadow-amber-500/30"
                    >
                      Upgrade for More Slots
                    </button>
                  </div>
                )}
                {tier === '3months' && entries.length >= TIER_CONFIGS['3months'].jobSeekerAppCap && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      You've reached your {TIER_CONFIGS['3months'].jobSeekerAppCap}-application cap for Placement Sprint.
                    </p>
                    <button
                      onClick={onOpenPricing}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-xl hover:shadow-amber-500/30"
                    >
                      Upgrade to Career Pro
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
