import { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { extractTextFromFile } from '@/lib/fileExtractor';

interface DragDropResumeProps {
  resumeText: string;
  onTextChange: (text: string) => void;
}

export function DragDropResume({ resumeText, onTextChange }: DragDropResumeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setExtracting(true);
      setExtractError(null);
      setExtractSuccess(false);
      setFileName(file.name);

      try {
        const text = await extractTextFromFile(file);
        if (text.trim().length < 10) {
          throw new Error('Could not extract enough text from this file. Try pasting manually.');
        }
        onTextChange(text);
        setExtractSuccess(true);
      } catch (err) {
        setExtractError(err instanceof Error ? err.message : 'Failed to extract text from file.');
        setFileName(null);
      } finally {
        setExtracting(false);
      }
    },
    [onTextChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearFile = () => {
    setFileName(null);
    setExtractError(null);
    setExtractSuccess(false);
    onTextChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* File info bar */}
      {(fileName || extractError) && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
            extractError
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {extracting ? (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : extractError ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="flex-1 truncate">
            {extracting
              ? `Extracting text from ${fileName}...`
              : extractError ?? `${fileName} - text extracted successfully`}
          </span>
          {!extracting && (
            <button
              onClick={clearFile}
              className="flex-shrink-0 rounded-lg p-1 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Drag-drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`group cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-emerald-400/60 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-950/50 hover:border-emerald-500/40 hover:bg-emerald-500/5'
        }`}
      >
        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full transition ${
            isDragging
              ? 'bg-emerald-500/20 scale-110'
              : 'bg-slate-800 group-hover:bg-emerald-500/10'
          }`}
        >
          <UploadCloud
            className={`h-6 w-6 transition ${
              isDragging ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'
            }`}
          />
        </div>
        <p className="text-sm font-medium text-slate-300">
          {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, DOCX, or TXT - text is extracted automatically
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.text"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs text-slate-500">or paste manually</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      {/* Manual textarea */}
      <div className="relative">
        <textarea
          value={resumeText}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (e.target.value && fileName) {
              setFileName(null);
              setExtractSuccess(false);
            }
          }}
          placeholder="Paste your current resume text or a summary of your experience..."
          rows={8}
          className="scrollbar-thin w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
        />
        {resumeText && !fileName && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <FileText className="h-3 w-3" />
            {resumeText.length.toLocaleString()} characters
          </div>
        )}
      </div>
    </div>
  );
}
