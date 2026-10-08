import { useState } from 'react';
import {
  Trophy,
  ArrowRight,
  ArrowLeft,
  Download,
  FileText,
  CircleCheck,
  AlertTriangle,
  CircleX,
  ThumbsUp,
  Phone,
  Mail,
  Copy,
  Check,
  X,
  Crown,
  TrendingUp,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import type { BulkCandidate, BulkCandidateStatus } from '@/types';
import { getBulkStatus } from '@/types';
import { deriveRecruiterInsights } from '@/types';

interface CandidateLeaderboardProps {
  candidates: BulkCandidate[];
  jobTitle: string;
  companyName: string;
  isRecruiterPro: boolean;
  onOpenPricing: () => void;
  onSaveToPipeline: () => void;
}

const statusConfig: Record<BulkCandidateStatus, { color: string; bg: string; ring: string; border: string; icon: typeof CircleCheck }> = {
  Shortlist: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', border: 'border-emerald-500/30', icon: CircleCheck },
  Review: { color: 'text-amber-400', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', border: 'border-amber-500/30', icon: AlertTriangle },
  Reject: { color: 'text-red-400', bg: 'bg-red-500/15', ring: 'ring-red-500/30', border: 'border-red-500/30', icon: CircleX },
};

function CopyButton({ text, label }: { text: string; label: string }) {
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
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function exportCSV(candidates: BulkCandidate[], jobTitle: string, companyName: string) {
  const header = 'Rank,Candidate,Score,Status,Key Strengths,Disqualifiers\n';
  const rows = candidates
    .map((c, i) => {
      const status = getBulkStatus(c.fitVerdict);
      const strengths = c.strengths.join('; ').replace(/"/g, "'");
      const disqualifiers = c.disqualifiers.join('; ').replace(/"/g, "'");
      return `"${i + 1}","${c.label}","${c.fitScore}","${status}","${strengths}","${disqualifiers}"`;
    })
    .join('\n');
  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidate-matrix-${companyName || 'report'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExecutiveSummary(candidates: BulkCandidate[], jobTitle: string, companyName: string) {
  const role = jobTitle || 'the role';
  const comp = companyName || 'the company';
  const shortlist = candidates.filter((c) => c.fitVerdict === 'strong');
  const review = candidates.filter((c) => c.fitVerdict === 'moderate');
  const reject = candidates.filter((c) => c.fitVerdict === 'weak');

  const printContent = `
    <html>
    <head>
      <title>Executive Screening Summary - ${comp}</title>
      <style>
        * { font-family: 'Inter', Arial, sans-serif; box-sizing: border-box; }
        body { padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
        .stat { border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; text-align: center; }
        .stat-num { font-size: 28px; font-weight: 800; }
        .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-top: 4px; }
        .green { color: #059669; } .amber { color: #d97706; } .red { color: #dc2626; }
        h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 24px 0 10px; }
        .candidate { border: 1px solid #e0e0e0; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
        .cand-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .cand-name { font-size: 15px; font-weight: 700; }
        .cand-score { font-size: 20px; font-weight: 800; }
        .badge { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 20px; }
        .badge-green { background: #ecfdf5; color: #059669; } .badge-amber { background: #fffbeb; color: #d97706; } .badge-red { background: #fef2f2; color: #dc2626; }
        .tags { font-size: 12px; color: #555; margin-top: 6px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Executive Screening Summary</h1>
      <p class="subtitle">${role} at ${comp} — ${candidates.length} candidates screened on ${new Date().toLocaleDateString()}</p>
      <div class="summary-grid">
        <div class="stat"><div class="stat-num green">${shortlist.length}</div><div class="stat-label">Shortlist</div></div>
        <div class="stat"><div class="stat-num amber">${review.length}</div><div class="stat-label">Review</div></div>
        <div class="stat"><div class="stat-num red">${reject.length}</div><div class="stat-label">Reject</div></div>
      </div>
      <h2>Ranked Candidates</h2>
      ${candidates
        .map((c, i) => {
          const status = getBulkStatus(c.fitVerdict);
          const badgeClass = status === 'Shortlist' ? 'badge-green' : status === 'Review' ? 'badge-amber' : 'badge-red';
          const scoreColor = c.fitVerdict === 'strong' ? 'green' : c.fitVerdict === 'moderate' ? 'amber' : 'red';
          return `
          <div class="candidate">
            <div class="cand-header">
              <div><span style="color:#999;font-size:12px;">#${i + 1}</span> <span class="cand-name">${c.label}</span></div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge ${badgeClass}">${status}</span>
                <span class="cand-score ${scoreColor}">${c.fitScore}%</span>
              </div>
            </div>
            <div class="tags"><strong>Strengths:</strong> ${c.strengths.join(' · ')}</div>
            <div class="tags"><strong>Gaps:</strong> ${c.disqualifiers.join(' · ')}</div>
          </div>`;
        })
        .join('')}
      <div class="footer">Generated by ColdTailor Talent ATS - AI-powered candidate screening</div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export function CandidateLeaderboard({
  candidates,
  jobTitle,
  companyName,
  isRecruiterPro,
  onOpenPricing,
  onSaveToPipeline,
}: CandidateLeaderboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const ranked = [...candidates].sort((a, b) => b.fitScore - a.fitScore);
  const selected = ranked.find((c) => c.id === selectedId) ?? null;

  const handleSaveToPipeline = () => {
    onSaveToPipeline();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  if (selected) {
    const insights = deriveRecruiterInsights(selected.result, jobTitle, companyName);
    const status = getBulkStatus(selected.fitVerdict);
    const cfg = statusConfig[status];
    const StatusIcon = cfg.icon;
    const rank = ranked.findIndex((c) => c.id === selected.id) + 1;

    return (
      <div className="space-y-5">
        {/* Back button */}
        <button
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leaderboard
        </button>

        {/* Candidate header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
          <div className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full ${cfg.bg} blur-3xl opacity-50`} />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.bg} ring-1 ${cfg.ring}`}>
                <StatusIcon className={`h-7 w-7 ${cfg.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">#{rank}</span>
                  <h3 className="text-xl font-bold text-slate-50">{selected.label}</h3>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className={`text-2xl font-bold tabular-nums ${cfg.color}`}>{selected.fitScore}%</span>
                  <span className={`inline-flex items-center gap-1 rounded-full ${cfg.bg} px-2.5 py-0.5 text-xs font-bold ${cfg.color} ring-1 ${cfg.ring}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status}
                  </span>
                </div>
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
            {insights.keyStrengths.map((s, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3.5 text-sm leading-relaxed text-slate-200"
                style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                {s}
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
            {insights.redFlags.map((f, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3.5 text-sm leading-relaxed text-slate-200"
                style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Interview Script */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4 text-sky-400" />
            <h4 className="text-sm font-semibold text-slate-200">Interview Script</h4>
          </div>
          <div className="space-y-3">
            {insights.interviewQuestions.map((q, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50"
                style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.1}s both` }}
              >
                <div className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-xs font-bold text-sky-400">
                    Q{i + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-slate-100">{q.question}</p>
                </div>
                <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expected Talking Points</p>
                  <p className="text-xs leading-relaxed text-slate-400">{q.expectedPoints}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Templates */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-400" />
            <h4 className="text-sm font-semibold text-slate-200">Email Templates</h4>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Shortlist Email</span>
                <CopyButton text={`Subject: ${insights.shortlistEmail.subject}\n\n${insights.shortlistEmail.body}`} label="Copy" />
              </div>
              <p className="mb-2 text-xs font-medium text-slate-500">Subject: {insights.shortlistEmail.subject}</p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{insights.shortlistEmail.body}</p>
            </div>
            <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-red-300">Rejection Email</span>
                <CopyButton text={`Subject: ${insights.rejectionEmail.subject}\n\n${insights.rejectionEmail.body}`} label="Copy" />
              </div>
              <p className="mb-2 text-xs font-medium text-slate-500">Subject: {insights.rejectionEmail.subject}</p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{insights.rejectionEmail.body}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Leaderboard header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">Candidate Leaderboard</h3>
          <span className="text-xs text-slate-500">({ranked.length} screened)</span>
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 text-sky-400" />
            Export Matrix
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-fade-in-up">
                <button
                  onClick={() => {
                    exportCSV(ranked, jobTitle, companyName);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                    <FileText className="h-4 w-4 text-emerald-400" />
                  </span>
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    if (!isRecruiterPro) {
                      setShowExportMenu(false);
                      onOpenPricing();
                      return;
                    }
                    exportExecutiveSummary(ranked, jobTitle, companyName);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15">
                    <TrendingUp className="h-4 w-4 text-sky-400" />
                  </span>
                  Executive Summary PDF
                  {!isRecruiterPro && <Crown className="ml-auto h-3.5 w-3.5 text-amber-400" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['Shortlist', 'Review', 'Reject'] as BulkCandidateStatus[]).map((status) => {
          const count = ranked.filter((c) => getBulkStatus(c.fitVerdict) === status).length;
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <div
              key={status}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 text-center`}
            >
              <Icon className={`mx-auto mb-1 h-5 w-5 ${cfg.color}`} />
              <div className={`text-xl font-bold tabular-nums ${cfg.color}`}>{count}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{status}</div>
            </div>
          );
        })}
      </div>

      {/* Ranked list */}
      <div className="space-y-2.5">
        {ranked.map((candidate, i) => {
          const status = getBulkStatus(candidate.fitVerdict);
          const cfg = statusConfig[status];
          const StatusIcon = cfg.icon;
          const isTop = i === 0;
          return (
            <button
              key={candidate.id}
              onClick={() => setSelectedId(candidate.id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left transition-all hover:border-slate-700 hover:bg-slate-900/50"
              style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
            >
              {/* Rank */}
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                isTop ? 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300 ring-1 ring-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {isTop ? <Trophy className="h-5 w-5" /> : `#${i + 1}`}
              </div>

              {/* Name + tags */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-semibold text-slate-100">{candidate.label}</h4>
                  <span className={`inline-flex items-center gap-1 rounded-full ${cfg.bg} px-2 py-0.5 text-[10px] font-bold ${cfg.color} ring-1 ${cfg.ring} flex-shrink-0`}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {status}
                  </span>
                </div>
                {/* Strength/gap tags */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {candidate.strengths.slice(0, 1).map((s, si) => (
                    <span key={si} className="inline-flex items-center gap-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      + {s.slice(0, 40)}
                    </span>
                  ))}
                  {candidate.disqualifiers.slice(0, 1).map((d, di) => (
                    <span key={di} className="inline-flex items-center gap-0.5 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                      − {d.slice(0, 40)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score */}
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <span className={`text-2xl font-bold tabular-nums ${cfg.color}`}>{candidate.fitScore}</span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-600 transition group-hover:text-slate-300" />
            </button>
          );
        })}
      </div>

      {/* Save to Pipeline + Toast */}
      <div className="relative">
        <button
          onClick={handleSaveToPipeline}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30"
        >
          <Archive className="h-4 w-4" />
          Save to Hiring Pipeline
        </button>
        {saveToast && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-fade-in-up">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-emerald-300 shadow-2xl backdrop-blur-xl">
              <CheckCircle2 className="h-4 w-4" />
              Candidates saved to your Pipeline!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
