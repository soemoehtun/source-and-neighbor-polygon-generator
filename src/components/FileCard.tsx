import { useRef, useState } from 'react';
import type { ParseResult } from '../lib/csv';

type Props = {
  title: string;
  subtitle: string;
  accent: string;
  data: ParseResult | null;
  fileName: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
};

export default function FileCard({
  title,
  data,
  fileName,
  onFile,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-600">{title}</label>
        {data && (
          <button onClick={onClear} className="text-[10px] font-medium text-slate-400 hover:text-slate-700">
            clear
          </button>
        )}
      </div>

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
        className={`flex cursor-pointer items-center gap-2.5 rounded-md border-[1.5px] border-dashed px-3 py-3.5 transition ${
          drag
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50'
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
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="min-w-0 flex-1">
          {fileName ? (
            <div className="truncate text-[11px] font-semibold text-slate-700">{fileName}</div>
          ) : (
            <div className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Drag &amp; Drop</span> or Browse
            </div>
          )}
          <div className="text-[9px] uppercase tracking-wide text-slate-400">CSV · TXT · XLS · XLSX</div>
        </div>
        {data && !data.error && (
          <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
            ✓ {data.points.length}
          </span>
        )}
      </div>

      {data?.error && (
        <div className="mt-1 text-[10px] font-medium text-rose-600">⚠ {data.error}</div>
      )}
      {data && !data.error && data.skipped > 0 && (
        <div className="mt-1 text-[10px] font-medium text-amber-600">
          {data.skipped} row{data.skipped === 1 ? '' : 's'} skipped
        </div>
      )}
    </div>
  );
}
