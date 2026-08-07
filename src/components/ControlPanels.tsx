export type NumOrEmpty = number | '';

export function SearchPanel({
  sourceHeaders,
  filteredSourceRows,
  totalSourceRows,
  sourceSiteQuery,
  onSourceSiteQueryChange,
  onFilterReset,
  card = true,
}: {
  sourceHeaders: string[];
  filteredSourceRows: number;
  totalSourceRows: number;
  sourceSiteQuery: string;
  onSourceSiteQueryChange: (v: string) => void;
  onFilterReset: () => void;
  card?: boolean;
}) {
  return (
    <div className={card ? 'rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-slate-200' : ''}>
      <div className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          value={sourceSiteQuery}
          onChange={(e) => onSourceSiteQueryChange(e.target.value)}
          placeholder="Filter source site..."
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs outline-none focus:border-slate-900"
        />
        {sourceSiteQuery && (
          <button onClick={onFilterReset} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700">✕</button>
        )}
      </div>
      {sourceHeaders.length > 0 ? (
        <p className="mt-1.5 text-[10px] text-slate-400">
          {filteredSourceRows} of {totalSourceRows} source rows
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
          Upload a source file to search its site names.
        </p>
      )}
    </div>
  );
}

export function ParametersPanel({
  thresholdKm,
  onThresholdKmChange,
  maxNeighbors,
  onMaxNeighborsChange,
  minVertices,
  onMinVerticesChange,
  open,
  onToggle,
  card = true,
}: {
  thresholdKm: NumOrEmpty;
  onThresholdKmChange: (v: NumOrEmpty) => void;
  maxNeighbors: NumOrEmpty;
  onMaxNeighborsChange: (v: NumOrEmpty) => void;
  minVertices: NumOrEmpty;
  onMinVerticesChange: (v: NumOrEmpty) => void;
  open: boolean;
  onToggle: () => void;
  card?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-lg ring-1 ring-slate-200 ${card ? 'bg-white/95 shadow-lg' : 'bg-white'}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Parameters</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400 transition-transform">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 p-3">
          <label className="block text-[11px] font-medium text-slate-600">
            Source-to-neighbour site distance
            <span className="float-right font-mono text-slate-400">{thresholdKm === '' ? '—' : `${thresholdKm} km`}</span>
            <input
              type="range"
              min="0.1"
              max="50"
              step="0.1"
              value={thresholdKm === '' ? 0 : thresholdKm}
              onChange={(e) => onThresholdKmChange(parseFloat(e.target.value))}
              className="mt-1.5 h-1 w-full appearance-none rounded-full bg-slate-200 accent-slate-900 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900"
            />
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={thresholdKm}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') onThresholdKmChange('');
                else {
                  const n = parseFloat(v);
                  if (!isNaN(n)) onThresholdKmChange(n);
                }
              }}
              onBlur={() => {
                if (thresholdKm !== '' && Number(thresholdKm) < 0.01) onThresholdKmChange(0.01);
              }}
              className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none placeholder:text-slate-300 focus:border-slate-900"
            />
          </label>

          <label className="block text-[11px] font-medium text-slate-600">
            Max sites per polygon <span className="font-normal text-slate-400">(0 = unlimited)</span>
            <input
              type="number"
              min="0"
              value={maxNeighbors}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') onMaxNeighborsChange('');
                else {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) onMaxNeighborsChange(Math.max(0, n));
                }
              }}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none placeholder:text-slate-300 focus:border-slate-900"
            />
          </label>

          <label className="block text-[11px] font-medium text-slate-600">
            Min source-matched neighbours
            <input
              type="number"
              min="0"
              value={minVertices}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') onMinVerticesChange('');
                else {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) onMinVerticesChange(n);
                }
              }}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none placeholder:text-slate-300 focus:border-slate-900"
            />
          </label>
        </div>
      )}
    </div>
  );
}
