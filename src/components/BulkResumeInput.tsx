import { useState, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  User,
  Users,
  Trash2,
  Lock,
} from 'lucide-react';
import { extractTextFromFile } from '@/lib/fileExtractor';
import type { Tier } from '@/types';
import { TIER_CONFIGS, isPaidTier } from '@/types';

export interface ResumeSlot {
  id: string;
  label: string;
  resumeText: string;
  fileName: string | null;
  extracting: boolean;
  error: string | null;
}

export function createEmptySlot(index: number): ResumeSlot {
  return {
    id: `slot-${Date.now()}-${index}`,
    label: `Candidate ${index}`,
    resumeText: '',
    fileName: null,
    extracting: false,
    error: null,
  };
}

const FREE_MAX_SLOTS = 2;

interface BulkResumeInputProps {
  slots: ResumeSlot[];
  onSlotsChange: (slots: ResumeSlot[]) => void;
  isRecruiterPro: boolean;
  recruiterTier: Tier;
  onPaywall: () => void;
}

export function BulkResumeInput({ slots, onSlotsChange, isRecruiterPro, recruiterTier, onPaywall }: BulkResumeInputProps) {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const tierCfg = TIER_CONFIGS[recruiterTier] ?? TIER_CONFIGS.free;
  const effectiveMax = isPaidTier(recruiterTier) ? tierCfg.recruiterBatchMax : FREE_MAX_SLOTS;

  const updateSlot = (id: string, patch: Partial<ResumeSlot>) => {
    onSlotsChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSlot = (id: string) => {
    onSlotsChange(slots.filter((s) => s.id !== id));
  };

  const addSlot = () => {
    if (slots.length >= effectiveMax) {
      if (!isRecruiterPro) {
        onPaywall();
      }
      return;
    }
    onSlotsChange([...slots, createEmptySlot(slots.length + 1)]);
  };

  const handleFile = useCallback(
    async (slotId: string, file: File) => {
      updateSlot(slotId, { extracting: true, error: null, fileName: file.name });
      try {
        const text = await extractTextFromFile(file);
        if (text.trim().length < 10) {
          throw new Error('Could not extract enough text from this file.');
        }
        updateSlot(slotId, { resumeText: text, extracting: false, fileName: file.name });
      } catch (err) {
        updateSlot(slotId, {
          extracting: false,
          error: err instanceof Error ? err.message : 'Failed to extract text.',
          fileName: null,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots],
  );

  const filledCount = slots.filter((s) => s.resumeText.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5 text-sky-400" />
          <span>
            {filledCount} candidate{filledCount !== 1 ? 's' : ''} ready
            {!isRecruiterPro && ` · ${effectiveMax} max on Free`}
            {isRecruiterPro && (effectiveMax === 99 ? ' · Unlimited' : ` · ${effectiveMax} max per batch`)}
          </span>
        </div>
        {slots.length < effectiveMax && (
          <button
            onClick={addSlot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Candidate
          </button>
        )}
        {!isRecruiterPro && slots.length >= FREE_MAX_SLOTS && (
          <button
            onClick={onPaywall}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            <Lock className="h-3.5 w-3.5" />
            Unlock Unlimited
          </button>
        )}
      </div>

      {/* Free tier limit notice */}
      {!isRecruiterPro && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-[11px] text-slate-400">
          Free plan allows up to {FREE_MAX_SLOTS} candidates.{' '}
          <button onClick={onPaywall} className="font-semibold text-amber-400 underline-offset-2 hover:underline">
            Upgrade to Recruiter Pro
          </button>{' '}
          for bulk screening.
        </div>
      )}
      {isRecruiterPro && effectiveMax < 99 && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[11px] text-slate-400">
          Your plan allows up to {effectiveMax} candidates per batch.{' '}
          <button onClick={onPaywall} className="font-semibold text-sky-400 underline-offset-2 hover:underline">
            Upgrade for unlimited batches
          </button>
        </div>
      )}

      {/* Slots */}
      <div className="space-y-3">
        {slots.map((slot) => {
          const isActive = activeSlotId === slot.id;
          const hasContent = slot.resumeText.trim().length > 0;
          return (
            <div
              key={slot.id}
              className={`overflow-hidden rounded-xl border transition-all ${
                isActive
                  ? 'border-sky-500/40 bg-slate-950/60'
                  : 'border-slate-700/60 bg-slate-950/40'
              }`}
            >
              {/* Slot header */}
              <div className="flex items-center gap-2 border-b border-slate-800/60 px-3 py-2.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                  hasContent ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {hasContent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <User className="h-3 w-3" />}
                </div>
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                  placeholder={`Candidate ${slots.indexOf(slot) + 1} name`}
                  className="flex-1 bg-transparent text-sm font-medium text-slate-200 placeholder-slate-600 outline-none"
                />
                {slot.fileName && (
                  <span className="hidden text-[10px] text-slate-500 sm:inline">{slot.fileName}</span>
                )}
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="rounded p-1 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setActiveSlotId(isActive ? null : slot.id)}
                  className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                >
                  {isActive ? 'Hide' : 'Expand'}
                </button>
              </div>

              {/* Error bar */}
              {slot.error && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {slot.error}
                </div>
              )}

              {/* Expanded content */}
              {isActive && (
                <div className="space-y-3 p-3 animate-fade-in-up">
                  {/* Drop zone */}
                  <label
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFile(slot.id, file);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="group flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/40 py-4 text-xs text-slate-500 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-sky-400"
                  >
                    {slot.extracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        Drop resume PDF/DOCX/TXT or click to browse
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.text"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(slot.id, file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      value={slot.resumeText}
                      onChange={(e) => {
                        updateSlot(slot.id, { resumeText: e.target.value, fileName: null });
                      }}
                      placeholder="Or paste candidate resume text here..."
                      rows={5}
                      className="scrollbar-thin w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs leading-relaxed text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
                    />
                    {slot.resumeText && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <FileText className="h-3 w-3" />
                        {slot.resumeText.length.toLocaleString()} characters
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsed preview */}
              {!isActive && hasContent && (
                <div className="px-3 py-2 text-xs text-slate-500">
                  <span className="line-clamp-1">{slot.resumeText.slice(0, 120)}...</span>
                </div>
              )}
            </div>
          );
        })}

        {slots.length === 0 && (
          <button
            onClick={addSlot}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 py-6 text-sm text-slate-500 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-sky-400"
          >
            <Plus className="h-4 w-4" />
            Add your first candidate
          </button>
        )}
      </div>
    </div>
  );
}
