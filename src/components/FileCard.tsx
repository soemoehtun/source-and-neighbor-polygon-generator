import { useRef, useState } from 'react';
import type { ParseResult } from '../lib/csv';

type Props = {
  title: string;
  subtitle: string;
  accent: string; // tailwind color classes for the badge
  data: ParseResult | null;
  fileName: string | null;
  onFile: (file: File) => void;
  onPasteText: (text: string) => void;
  onClear: () => void;
};

export default function FileCard({
  title,
  data,
  fileName,
  onFile,
  onPasteText,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [text, setText] = useState('');

  return (
    <div className="form-group">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{title}</label>
        {data && (
          <button onClick={onClear} className="text-[11px] font-medium text-slate-400 hover:text-slate-700">
            clear
          </button>
        )}
      </div>

      {/* Dropzone – matches the reference tool */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed px-3 py-5 text-center transition ${
          drag ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {fileName ? (
          <span className="max-w-full truncate text-xs font-semibold text-slate-700">{fileName}</span>
        ) : (
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Drag &amp; Drop</span> or Browse
          </span>
        )}
        <span className="text-[10px] uppercase tracking-wide text-slate-400">CSV · TXT · XLS · XLSX</span>
      </div>

      {/* Status */}
      {data && (
        data.error ? (
          <div className="mt-2 text-[11px] font-medium text-rose-600">⚠ {data.error}</div>
        ) : (
          <div className="mt-2 text-[11px] font-semibold text-emerald-600">
            ✓ {data.points.length} records loaded
            {data.skipped > 0 && <span className="font-medium text-amber-600"> · {data.skipped} skipped</span>}
          </div>
        )
      )}

      <button
        onClick={() => setShowPaste((s) => !s)}
        className="mt-1.5 text-[11px] font-medium text-blue-600 hover:underline"
      >
        {showPaste ? 'Hide paste box' : 'Or paste text'}
      </button>
      {showPaste && (
        <div className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={'Site,Long,Lat\nSITE_A,106.82,-6.2'}
            className="w-full rounded-md border border-slate-200 p-2 font-mono text-[11px] outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              if (text.trim()) onPasteText(text);
            }}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            Load pasted data
          </button>
        </div>
      )}
    </div>
  );
}
