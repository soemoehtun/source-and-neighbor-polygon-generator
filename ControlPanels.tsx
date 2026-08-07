import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import FileCard from './components/FileCard';
import MapView from './components/MapView';
import { SearchPanel, ParametersPanel } from './components/ControlPanels';
import {
  exportSummary,
  mapRowsToPoints,
  parseInputFile,
  type ColumnMapping,
  type ParseResult,
} from './lib/csv';
import { defaultSiteStyle } from './lib/colors';
import { buildResults } from './lib/geo';
import { exportKmzBundle } from './lib/kmz';

type Dataset = { data: ParseResult | null; fileName: string | null };
const EMPTY: Dataset = { data: null, fileName: null };
const styleFor = defaultSiteStyle;

export default function App() {
  const [source, setSource] = useState<Dataset>(EMPTY);
  const [neighbour, setNeighbour] = useState<Dataset>(EMPTY);
  const [sourceMapping, setSourceMapping] = useState<ColumnMapping>({ site: '', lat: '', lon: '' });
  const [neighbourMapping, setNeighbourMapping] = useState<ColumnMapping>({ site: '', lat: '', lon: '' });
  const [thresholdKm, setThresholdKm] = useState<number | ''>(5);
  const [maxNeighbors, setMaxNeighbors] = useState<number | ''>(20);
  const [minVertices, setMinVertices] = useState<number | ''>(3);
  const includeSource = true;
  const showAllNeighbors = true;
  const showLinks = true;

  const [sourceSiteQuery, setSourceSiteQuery] = useState('');

  const [panelOpen, setPanelOpen] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'upload' | 'parameter'>('upload');
  const [kmzMenuOpen, setKmzMenuOpen] = useState(false);
  const [mobileParamsOpen, setMobileParamsOpen] = useState(true);

  const searchedSourceRows = useMemo(() => {
    const rows = source.data?.rows ?? [];
    const q = sourceSiteQuery.trim().toLowerCase();
    if (!q) return rows;
    // Search only selects a source; it does not remove other sources from polygon calculations.
    const siteCol = sourceMapping.site || source.data?.headers[0] || '';
    if (!siteCol) return rows;
    return rows.filter((row) => String(row[siteCol] ?? '').toLowerCase().includes(q));
  }, [source.data, sourceSiteQuery, sourceMapping.site]);

  const mappedSource = useMemo(
    () => (source.data ? mapRowsToPoints(source.data.rows, sourceMapping) : { points: [], skipped: 0 }),
    [source.data, sourceMapping],
  );
  const mappedNeighbour = useMemo(
    () => (neighbour.data ? mapRowsToPoints(neighbour.data.rows, neighbourMapping) : { points: [], skipped: 0 }),
    [neighbour.data, neighbourMapping],
  );
  const sourcePts = mappedSource.points;
  const neighbourPts = mappedNeighbour.points;

  // Site names present in the source list — used to colour matching neighbours green.
  const sourceNameSet = useMemo(
    () => new Set(sourcePts.map((p) => p.site.trim().toLowerCase())),
    [sourcePts],
  );

  const sourceStatus = useMemo<ParseResult | null>(
    () => (source.data ? { ...source.data, ...mappedSource } : null),
    [source.data, mappedSource],
  );
  const neighbourStatus = useMemo<ParseResult | null>(
    () => (neighbour.data ? { ...neighbour.data, ...mappedNeighbour } : null),
    [neighbour.data, mappedNeighbour],
  );

  const results = useMemo(
    () =>
      buildResults(sourcePts, neighbourPts, {
        thresholdKm: thresholdKm === '' ? 0 : Number(thresholdKm),
        maxNeighbors: maxNeighbors === '' ? 0 : Number(maxNeighbors),
        includeSourceInPolygon: includeSource,
        minNeighborsForPolygon: minVertices === '' ? 0 : Number(minVertices),
        polygonMode: 'hull',
      }),
    [sourcePts, neighbourPts, thresholdKm, maxNeighbors, includeSource, minVertices],
  );

  // Search selects the source while retaining the full source list for polygon eligibility.
  useEffect(() => {
    const q = sourceSiteQuery.trim().toLowerCase();
    if (!q) return;
    const exact = results.findIndex((r) => r.source.site.toLowerCase() === q);
    const partial = results.findIndex((r) => r.source.site.toLowerCase().includes(q));
    const idx = exact >= 0 ? exact : partial;
    setSelected(idx >= 0 ? idx : null);
  }, [sourceSiteQuery, results]);

  const active = selected === null ? null : results[selected] ?? null;
  const totals = useMemo(() => {
    const links = results.reduce((sum, r) => sum + r.neighbors.length, 0);
    const polygons = results.filter((r) => r.hull.length >= 3).length;
    const area = results.reduce((sum, r) => sum + r.areaKm2, 0);
    return { links, polygons, area };
  }, [results]);

  const setSourceData = (data: ParseResult, fileName: string) => {
    setSource({ data, fileName });
    setSourceMapping(data.mapping);
    setSelected(null);
    setSourceSiteQuery('');
  };
  const setNeighbourData = (data: ParseResult, fileName: string) => {
    setNeighbour({ data, fileName });
    setNeighbourMapping(data.mapping);
    setSelected(null);
  };
  const loadFile = async (file: File, type: 'source' | 'neighbour') => {
    const parsed = await parseInputFile(file);
    type === 'source' ? setSourceData(parsed, file.name) : setNeighbourData(parsed, file.name);
  };
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white font-sans text-slate-800">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setPanelOpen((o) => !o)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900" aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <div className="truncate text-sm font-bold tracking-tight">Site Polygon Builder</div>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex shrink-0">
          <div className="relative">
            <button
              disabled={!totals.polygons}
              onClick={() => setKmzMenuOpen((v) => !v)}
              className="flex h-8 w-32 items-center justify-center gap-1 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Export KMZ
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {kmzMenuOpen && (
              <>
                <button className="fixed inset-0 z-[2500] cursor-default" onClick={() => setKmzMenuOpen(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-9 z-[2600] w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    onClick={() => {
                      exportKmzBundle(results, styleFor, 'polygon');
                      setKmzMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Polygon only
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-400">Just the polygon shape</span>
                  </button>
                  <button
                    onClick={() => {
                      exportKmzBundle(results, styleFor, 'polygon+sites');
                      setKmzMenuOpen(false);
                    }}
                    className="block w-full border-t border-slate-100 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Polygon + Sites
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-400">Polygon with source &amp; neighbour pins</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            disabled={!results.length}
            onClick={() => exportSummary(results, sourceNameSet)}
            className="flex h-8 w-32 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
          >
            Download CSV
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className={`absolute inset-y-0 left-0 z-[2000] flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:relative md:inset-auto md:z-auto ${panelOpen ? 'w-full md:w-[390px]' : 'w-0 overflow-hidden border-r-0'}`}>

          {panelOpen && (
            <>
          {/* Mobile: pill-style tab bar matching the reference */}
          <div className="flex gap-1 border-b border-slate-200 p-2 shrink-0 md:hidden">
            <button
              onClick={() => setMobileTab('upload')}
              className={`flex-1 flex items-center justify-start gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-semibold tracking-wider transition ${
                mobileTab === 'upload'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              UPLOAD
            </button>
            <button
              onClick={() => setMobileTab('parameter')}
              className={`flex-1 flex items-center justify-start gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-semibold tracking-wider transition ${
                mobileTab === 'parameter'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              PARAMETER
            </button>
          </div>

          {/* Desktop: plain Upload header, no tabs */}
          <div className="hidden border-b border-slate-200 px-3 py-2.5 md:block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Upload</span>
          </div>

          <div className="mobile-sidebar-body min-h-0 flex-1 overflow-y-auto p-3">
              {/* Parameter tab — mobile only */}
              <div className={`space-y-3 md:hidden ${mobileTab === 'parameter' ? '' : 'hidden'}`}>
                <SearchPanel
                  sourceHeaders={source.data?.headers ?? []}
                  filteredSourceRows={searchedSourceRows.length}
                  totalSourceRows={source.data?.rows.length ?? 0}
                  sourceSiteQuery={sourceSiteQuery}
                  onSourceSiteQueryChange={setSourceSiteQuery}
                  onFilterReset={() => {
                    setSourceSiteQuery('');
                    setSelected(null);
                  }}
                  card={false}
                />
                <ParametersPanel
                  thresholdKm={thresholdKm}
                  onThresholdKmChange={setThresholdKm}
                  maxNeighbors={maxNeighbors}
                  onMaxNeighborsChange={setMaxNeighbors}
                  minVertices={minVertices}
                  onMinVerticesChange={setMinVertices}
                  open={mobileParamsOpen}
                  onToggle={() => setMobileParamsOpen((v) => !v)}
                  card={false}
                />
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <button
                    disabled={!totals.polygons}
                    onClick={() => exportKmzBundle(results, styleFor, 'polygon')}
                    className="flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    KMZ · Polygon only
                  </button>
                  <button
                    disabled={!totals.polygons}
                    onClick={() => exportKmzBundle(results, styleFor, 'polygon+sites')}
                    className="flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    KMZ · Polygon + Sites
                  </button>
                  <button
                    disabled={!results.length}
                    onClick={() => exportSummary(results, sourceNameSet)}
                    className="flex h-9 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    Download CSV
                  </button>
                </div>
              </div>

              <div className={`space-y-3 ${mobileTab === 'parameter' ? 'hidden md:block' : ''}`}>
                <Section title="Upload site lists">
                  <div className="space-y-3">
                    <FileCard
                      title="1 · Source file"
                      subtitle="Each row creates one independent source polygon"
                      accent="bg-indigo-500"
                      data={sourceStatus}
                      fileName={source.fileName}
                      onFile={(file) => loadFile(file, 'source')}
                      onClear={() => {
                        setSource(EMPTY);
                        setSourceMapping({ site: '', lat: '', lon: '' });
                      }}
                    />
                    <FileCard
                      title="2 · Neighbour file"
                      subtitle="Sites searched around every source site"
                      accent="bg-teal-500"
                      data={neighbourStatus}
                      fileName={neighbour.fileName}
                      onFile={(file) => loadFile(file, 'neighbour')}
                      onClear={() => {
                        setNeighbour(EMPTY);
                        setNeighbourMapping({ site: '', lat: '', lon: '' });
                      }}
                    />
                  </div>
                </Section>
                {source.data && (
                  <ColumnMappingPanel title="Source column mapping" data={source.data} mapping={sourceMapping} onChange={setSourceMapping} />
                )}
                {neighbour.data && (
                  <ColumnMappingPanel title="Neighbour column mapping" data={neighbour.data} mapping={neighbourMapping} onChange={setNeighbourMapping} />
                )}
              </div>
          </div>
            </>
          )}
        </aside>

        {panelOpen && (
          <button
            aria-label="Close mobile sidebar"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 z-[1500] bg-slate-900/25 md:hidden"
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col bg-slate-100">
          <div className="relative min-h-0 flex-1 bg-slate-100">
            <MapView
              results={results}
              allNeighbors={showAllNeighbors ? neighbourPts : []}
              sourceNames={sourceNameSet}
              selected={selected}
              showAllNeighbors={showAllNeighbors}
              showLinks={showLinks}
              styleFor={styleFor}
              onSelect={setSelected}
              sourceHeaders={source.data?.headers ?? []}
              filteredSourceRows={searchedSourceRows.length}
              totalSourceRows={source.data?.rows.length ?? 0}
              sourceSiteQuery={sourceSiteQuery}
              onSourceSiteQueryChange={setSourceSiteQuery}
              onFilterReset={() => {
                setSourceSiteQuery('');
                setSelected(null);
              }}
              thresholdKm={thresholdKm}
              onThresholdKmChange={setThresholdKm}
              maxNeighbors={maxNeighbors}
              onMaxNeighborsChange={setMaxNeighbors}
              minVertices={minVertices}
              onMinVerticesChange={setMinVertices}
            />

          </div>

          {active && (
            <section className="h-[38%] min-h-[255px] overflow-hidden border-t border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">Neighbours of {active.source.site}</h2>
                <button
                  onClick={() => {
                    setSelected(null);
                    setSourceSiteQuery('');
                  }}
                  aria-label="Close table"
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="h-[calc(100%-37px)] overflow-auto">
                <DetailTable result={active} sourceNames={sourceNameSet} />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-3 py-2"><h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</h2></div><div className="p-3">{children}</div></section>;
}

function ColumnMappingPanel({ title, data, mapping, onChange }: { title: string; data: ParseResult | null; mapping: ColumnMapping; onChange: (mapping: ColumnMapping) => void }) {
  if (!data) return null;
  const Field = ({ field, label, required = false }: { field: keyof ColumnMapping; label: string; required?: boolean }) => (
    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
      <span className="w-16 shrink-0">{label}{required && <span className="text-rose-500">*</span>}</span>
      <select value={mapping[field]} onChange={(e) => onChange({ ...mapping, [field]: e.target.value })} className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-slate-900">
        <option value="">Select...</option>
        {data.headers.map((header) => <option key={header} value={header}>{header}</option>)}
      </select>
    </label>
  );
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</h2>
      </div>
      <div className="space-y-1.5 p-2">
        <Field field="site" label="Site" />
        <Field field="lat" label="Lat" required />
        <Field field="lon" label="Long" required />
      </div>
    </section>
  );
}

function DetailTable({
  result,
  sourceNames,
}: {
  result: ReturnType<typeof buildResults>[number];
  sourceNames: Set<string>;
}) {
  const isOnEdge = (n: { site: string }) =>
    result.hull.length >= 3 && result.hull.some((v) => v.site === n.site);

  return (
    <div>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>{['#', 'Neighbour site', 'Source', 'Lat', 'Long', 'Site-to-site distance (km)', 'In polygon'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {result.neighbors.map((n, i) => (
            <tr key={`${n.site}-${i}`} className="border-b border-slate-100">
              <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
              <td className="px-3 py-1.5 font-semibold">{n.site}</td>
              <td className="px-3 py-1.5">
                {sourceNames.has(n.site.trim().toLowerCase()) ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">YES</span>
                ) : (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">NO</span>
                )}
              </td>
              <td className="px-3 py-1.5 font-mono text-[11px]">{n.lat.toFixed(6)}</td>
              <td className="px-3 py-1.5 font-mono text-[11px]">{n.lon.toFixed(6)}</td>
              <td className="px-3 py-1.5 font-semibold">{n.distanceKm.toFixed(4)}</td>
              <td className="px-3 py-1.5">
                {isOnEdge(n) ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">edge</span>
                ) : n.inPolygon ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">inside</span>
                ) : (
                  <span className="text-slate-400">outside</span>
                )}
              </td>
            </tr>
          ))}
          {!result.neighbors.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No neighbour site is within the source-to-neighbour site distance.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}


