import { Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { SourceResult, Point } from '../lib/geo';
import { haversineKm } from '../lib/geo';
import { colorFor, SOURCE_COLOR } from '../lib/colors';
import type { SiteStyle } from '../lib/colors';
import { SearchPanel, ParametersPanel } from './ControlPanels';

export { colorFor };

const BASEMAPS = [
  {
    id: 'light',
    label: 'Map',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    thumb: 'https://a.basemaps.cartocdn.com/light_all/12/3143/1852.png',
    bg: '#f8fafc',
    accent: '#cbd5e1',
  },
  {
    id: 'street',
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    thumb: 'https://tile.openstreetmap.org/12/3143/1852.png',
    bg: '#f0eadb',
    accent: '#fff',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    thumb: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1852/3143',
    bg: '#1a3a2a',
    accent: '#468058',
  },
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM · Map style: &copy; OpenTopoMap',
    thumb: 'https://a.tile.opentopomap.org/12/3143/1852.png',
    bg: '#e8dcc8',
    accent: '#a07c58',
  },
] as const;

const MapThumb: React.FC<{ id: string }> = ({ id }) => {
  if (id === 'street')
    return (
      <svg viewBox="0 0 60 60" className="h-full w-full">
        <rect width="60" height="60" fill="#f0eadb" />
        <line x1="0" y1="30" x2="60" y2="30" stroke="#fff" strokeWidth="2.5" />
        <line x1="30" y1="0" x2="30" y2="60" stroke="#fff" strokeWidth="2.5" />
        <line x1="0" y1="45" x2="60" y2="45" stroke="#fff" strokeWidth="1.5" />
        <line x1="45" y1="0" x2="45" y2="60" stroke="#fff" strokeWidth="1.5" />
        <rect x="8" y="14" width="12" height="10" rx="1" fill="#ffd6a5" stroke="#e8a050" strokeWidth="0.5" />
        <rect x="36" y="36" width="14" height="10" rx="1" fill="#cde0ff" stroke="#90b4d8" strokeWidth="0.5" />
        <rect x="48" y="14" width="10" height="10" rx="1" fill="#f7c6c7" stroke="#d49092" strokeWidth="0.5" />
      </svg>
    );
  if (id === 'satellite')
    return (
      <svg viewBox="0 0 60 60" className="h-full w-full">
        <rect width="60" height="60" fill="#1a3a2a" />
        <rect x="0" y="0" width="28" height="26" fill="#2a5a3a" />
        <rect x="26" y="20" width="34" height="18" fill="#1e4a30" />
        <rect x="5" y="28" width="20" height="28" fill="#22482e" />
        <circle cx="40" cy="12" r="8" fill="#3a7a50" opacity="0.6" />
        <circle cx="18" cy="48" r="6" fill="#347048" opacity="0.5" />
      </svg>
    );
  if (id === 'topo')
    return (
      <svg viewBox="0 0 60 60" className="h-full w-full">
        <rect width="60" height="60" fill="#e8dcc8" />
        <ellipse cx="30" cy="28" rx="24" ry="16" fill="none" stroke="#a07c58" strokeWidth="0.8" />
        <ellipse cx="30" cy="28" rx="16" ry="10" fill="none" stroke="#a07c58" strokeWidth="0.8" />
        <ellipse cx="30" cy="28" rx="8" ry="5" fill="none" stroke="#a07c58" strokeWidth="0.8" />
        <path d="M5 48 Q20 40 35 45 Q50 50 58 44" fill="none" stroke="#5078b0" strokeWidth="1.2" />
        <text x="8" y="54" fontSize="6" fill="#a07c58" fontFamily="sans-serif">200</text>
        <text x="22" y="22" fontSize="6" fill="#a07c58" fontFamily="sans-serif">500</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full">
      <rect width="60" height="60" fill="#f8fafc" />
      <line x1="0" y1="20" x2="60" y2="20" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="0" y1="40" x2="60" y2="40" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="20" y1="0" x2="20" y2="60" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="40" y1="0" x2="40" y2="60" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="25" y="25" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
      <rect x="8" y="42" width="8" height="8" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
    </svg>
  );
};

function MapPreview({ id, src }: { id: string; src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MapThumb id={id} />;
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}



function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch {
        /* noop */
      }
    }
  }, [bounds, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    // ResizeObserver handles both the sidebar toggle animation and window resizes
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    // Fallback: force one invalidation after the 200ms sidebar transition completes
    const t = setTimeout(() => map.invalidateSize(), 260);
    const onWin = () => map.invalidateSize();
    window.addEventListener('resize', onWin);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      window.removeEventListener('resize', onWin);
    };
  }, [map]);
  return null;
}

/** Appends each map click to the ruler path when the ruler tool is active. */
function RulerHandler({ active, onAdd }: { active: boolean; onAdd: (p: LatLngTuple) => void }) {
  useMapEvents({
    click: (e) => {
      if (active) onAdd([e.latlng.lat, e.latlng.lng]);
    },
    dblclick: (e) => {
      if (active) e.originalEvent.preventDefault();
    },
  });
  return null;
}

/** Tracks mouse position for the ruler live-preview line. */
let _mousePos: LatLngTuple | null = null;
function RulerMouseMove({ active, onMove }: { active: boolean; onMove: (p: LatLngTuple) => void }) {
  useMapEvents({
    mousemove: (e) => {
      if (active) {
        _mousePos = [e.latlng.lat, e.latlng.lng];
        onMove(_mousePos);
      }
    },
  });
  return null;
}

type Props = {
  results: SourceResult[];
  allNeighbors: Point[];
  sourceNames: Set<string>;
  selected: number | null;
  showAllNeighbors: boolean;
  showLinks: boolean;
  styleFor: (index: number) => SiteStyle;
  onSelect: (i: number) => void;
  sourceHeaders: string[];
  filteredSourceRows: number;
  totalSourceRows: number;
  sourceSiteQuery: string;
  onSourceSiteQueryChange: (value: string) => void;
  onFilterReset: () => void;
  thresholdKm: number | '';
  onThresholdKmChange: (value: number | '') => void;
  maxNeighbors: number | '';
  onMaxNeighborsChange: (value: number | '') => void;
  minVertices: number | '';
  onMinVerticesChange: (value: number | '') => void;
};

export default function MapView({
  results,
  allNeighbors,
  sourceNames,
  selected,
  showAllNeighbors,
  showLinks,
  styleFor,
  onSelect,
  sourceHeaders,
  filteredSourceRows,
  totalSourceRows,
  sourceSiteQuery,
  onSourceSiteQueryChange,
  onFilterReset,
  thresholdKm,
  onThresholdKmChange,
  maxNeighbors,
  onMaxNeighborsChange,
  minVertices,
  onMinVerticesChange,
}: Props) {
  const isSource = (site: string) => sourceNames.has(site.trim().toLowerCase());
  const [rulerOn, setRulerOn] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<LatLngTuple[]>([]);
  const [mouseLat, setMouseLat] = useState<number | null>(null);
  const [mouseLng, setMouseLng] = useState<number | null>(null);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [layerExpanded, setLayerExpanded] = useState(false);

  // Live preview distance from last point to cursor.
  const previewKm = useMemo(() => {
    if (rulerPoints.length === 0 || mouseLat == null || mouseLng == null) return null;
    const last = rulerPoints[rulerPoints.length - 1];
    return haversineKm(last[0], last[1], mouseLat, mouseLng);
  }, [rulerPoints, mouseLat, mouseLng]);

  // Total measured length + per-segment lengths.
  const rulerSegments = useMemo(
    () => rulerPoints.slice(1).map((p, i) => {
      const a = rulerPoints[i];
      return { a, b: p, km: haversineKm(a[0], a[1], p[0], p[1]) };
    }),
    [rulerPoints],
  );
  const rulerTotalKm = useMemo(
    () => rulerSegments.reduce((s, seg) => s + seg.km, 0),
    [rulerSegments],
  );

  const fmtKm = (km: number) =>
    km >= 1
      ? `${km.toFixed(km >= 10 ? 1 : 3)} km`
      : `${Math.round(km * 1000)} m`;
  const [basemap, setBasemap] = useState<string>('light');
  const active = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0];
  const visible = selected === null ? results : results.filter((_, i) => i === selected);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const pts: LatLngTuple[] = [];
    visible.forEach((r) => {
      pts.push([r.source.lat, r.source.lon]);
      r.neighbors.forEach((n) => pts.push([n.lat, n.lon]));
      r.hull.forEach((h) => pts.push([h.lat, h.lon]));
    });
    if (!pts.length && allNeighbors.length)
      allNeighbors.slice(0, 500).forEach((n) => pts.push([n.lat, n.lon]));
    return pts.length ? (pts as LatLngBoundsExpression) : null;
  }, [visible, allNeighbors]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[16.8661, 96.1951]}
        zoom={11}
        className="h-full w-full"
        preferCanvas
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer key={active.id} url={active.url} />
        <FitBounds bounds={bounds} />
        <InvalidateSize />
        <RulerHandler
          active={rulerOn}
          onAdd={(p) => setRulerPoints((prev) => prev.length >= 20 ? prev : [...prev, p])}
        />
        <RulerMouseMove
          active={rulerOn}
          onMove={(p) => {
            setMouseLat(p[0]);
            setMouseLng(p[1]);
          }}
        />

        {/* Live preview line from last point to cursor */}
        {rulerOn && rulerPoints.length > 0 && mouseLat != null && mouseLng != null && (
          <Polyline
            positions={[rulerPoints[rulerPoints.length - 1], [mouseLat, mouseLng]]}
            pathOptions={{ color: '#dc2626', weight: 1.5, dashArray: '3 6', opacity: 0.5 }}
          />
        )}

        {/* Ruler measurement line, vertices and segment labels */}
        {rulerPoints.length >= 2 && (
          <Polyline
            positions={rulerPoints}
            pathOptions={{ color: '#dc2626', weight: 2.5, dashArray: '5 5', opacity: 0.95 }}
          />
        )}
        {rulerPoints.map((p, i) => (
          <CircleMarker
            key={`ruler-pt-${i}`}
            center={p}
            radius={4}
            pathOptions={{ color: '#dc2626', weight: 1.5, fillColor: '#fff', fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -6]} className="site-label">
              {String(i + 1)}
            </Tooltip>
          </CircleMarker>
        ))}
        {rulerSegments.map((seg, i) => (
          <Polyline
            key={`ruler-seg-${i}`}
            positions={[seg.a, seg.b]}
            pathOptions={{ color: 'transparent', weight: 0 }}
          >
            <Tooltip permanent direction="center" className="measure-label">
              {fmtKm(seg.km)}
            </Tooltip>
          </Polyline>
        ))}

        {showAllNeighbors &&
          allNeighbors.map((n, i) => {
            const green = isSource(n.site);
            const c = green ? SOURCE_COLOR : '#ef4444';
            return (
              <CircleMarker
                key={`bg-${n.site}-${i}`}
                center={[n.lat, n.lon]}
                radius={green ? 3.5 : 2.5}
                pathOptions={{ color: c, weight: 1, fillColor: c, fillOpacity: green ? 0.7 : 0.35 }}
              >
                <Tooltip>{n.site}</Tooltip>
              </CircleMarker>
            );
          })}

        {results.map((r, idx) => {
          if (selected !== null && selected !== idx) return null;
          const style = styleFor(idx);
          return (
            <Fragment key={`grp-${r.source.site}-${idx}`}>
              {r.hull.length >= 3 && (
                <Polygon
                  positions={r.hull.map((p) => [p.lat, p.lon]) as LatLngTuple[]}
                  pathOptions={{
                    color: style.polygonColor,
                    weight: 2,
                    fillColor: style.polygonColor,
                    fillOpacity: style.polygonOpacity,
                  }}
                  eventHandlers={{ click: () => onSelect(idx) }}
                >
                  <Tooltip sticky>
                    <b>{r.source.site}</b>
                    <br />
                    {r.neighbors.length} neighbours · {r.areaKm2.toFixed(3)} km²
                  </Tooltip>
                </Polygon>
              )}

              {showLinks &&
                r.neighbors.map((n, i) => (
                  <Polyline
                    key={`ln-${idx}-${n.site}-${i}`}
                    positions={[
                      [r.source.lat, r.source.lon],
                      [n.lat, n.lon],
                    ]}
                    pathOptions={{ color: style.polygonColor, weight: 1, opacity: 0.35, dashArray: '3 4' }}
                  />
                ))}

              {r.neighbors.map((n, i) => {
                const green = isSource(n.site);
                const markerColor = green ? SOURCE_COLOR : style.neighbourColor;
                return (
                <CircleMarker
                  key={`nb-${idx}-${n.site}-${i}`}
                  center={[n.lat, n.lon]}
                  radius={green ? 5 : 4}
                  pathOptions={{
                    color: markerColor,
                    weight: 1.5,
                    fillColor: markerColor,
                    fillOpacity: 0.85,
                  }}
                >
                  <Tooltip>
                    <b>{n.site}</b>
                    <br />
                    {n.distanceKm.toFixed(3)} km · {n.bearing.toFixed(0)}°
                  </Tooltip>
                </CircleMarker>
                );
              })}

              <CircleMarker
                center={[r.source.lat, r.source.lon]}
                radius={7}
                pathOptions={{ color: '#0f172a', weight: 2, fillColor: style.sourceColor, fillOpacity: 1 }}
                eventHandlers={{ click: () => onSelect(idx) }}
              >
                <Tooltip permanent direction="top" offset={[0, -8]} className="site-label">
                  {r.source.site}
                </Tooltip>
              </CircleMarker>
            </Fragment>
          );
        })}
      </MapContainer>

      {/* Google Earth-style layer switcher — mobile only (collapsed thumbnail that expands) */}
      <div className="absolute right-4 top-4 z-[1000] md:hidden">
        {!layerExpanded ? (
          <button
            onClick={() => setLayerExpanded(true)}
            className="h-11 w-11 overflow-hidden rounded border-2 border-white bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            aria-label="Change map layer"
          >
            <MapPreview id={active.id} src={active.thumb} />
          </button>
        ) : (
          <div className="flex gap-2 rounded-lg bg-white p-2 shadow-[0_4px_20px_rgba(15,23,42,0.2)]">
            {BASEMAPS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBasemap(b.id);
                  setLayerExpanded(false);
                }}
                className={`w-[68px] rounded-md p-1 text-center transition hover:bg-slate-100 ${
                  basemap === b.id ? 'bg-blue-50' : ''
                }`}
              >
                <span
                  className={`mx-auto block h-[60px] w-[60px] overflow-hidden rounded border-2 ${
                    basemap === b.id ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <MapPreview id={b.id} src={b.thumb} />
                </span>
                <span
                  className={`mt-1 block truncate text-[10px] font-semibold ${
                    basemap === b.id ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right-side stacked controls: basemap switcher, then source data filter — desktop */}
      <div className="absolute right-4 top-4 z-[1000] hidden w-64 flex-col gap-2 md:flex">
        {/* Basemap switcher — full width, rectangle */}
        <div className="flex gap-0.5 rounded-md bg-white/95 p-0.5 shadow-lg ring-1 ring-slate-200">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBasemap(b.id)}
              className={`flex-1 rounded px-2 py-1.5 text-[10px] font-semibold transition ${
                basemap === b.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Ruler tool — desktop only */}
        <div className="hidden rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 md:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className={`h-4 w-4 ${rulerOn ? 'text-red-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4Z" />
                <path d="m8.7 9.7 1.4 1.4" /><path d="m12.1 6.3 1.4 1.4" /><path d="m15.5 2.9 1.4 1.4" /><path d="m5.3 13.1 1.4 1.4" />
              </svg>
              <span className="text-[11px] font-semibold text-slate-700">Ruler</span>
            </div>
            <div className="flex items-center gap-2">
              {rulerOn && (
                <button
                  onClick={() => setRulerOn(false)}
                  className="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-100"
                >
                  Done
                </button>
              )}
              <button
                onClick={() => setRulerOn((v) => !v)}
                className={`relative h-4 w-8 rounded-full transition-colors ${rulerOn ? 'bg-red-600' : 'bg-slate-300'}`}
                aria-label="Toggle ruler"
              >
                <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform" style={{ left: rulerOn ? 'calc(100% - 14px)' : '2px' }} />
              </button>
            </div>
          </div>
          {(rulerOn || rulerPoints.length > 0) && (
            <div className="mt-2 space-y-1.5">
              {/* Live preview */}
              {rulerOn && previewKm != null && (
                <div className="flex items-baseline justify-between rounded bg-red-50 px-2 py-1">
                  <span className="text-[10px] font-medium text-red-500">Preview</span>
                  <span className="text-xs font-bold text-red-600">{fmtKm(previewKm)}</span>
                </div>
              )}

              {/* Segment list */}
              {rulerSegments.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {rulerSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-medium">{i + 1} → {i + 2}</span>
                      <span className="font-mono">{fmtKm(seg.km)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions & Total */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex gap-1">
                  {rulerPoints.length > 1 && (
                    <button
                      onClick={() => setRulerPoints((p) => p.slice(0, -1))}
                      className="rounded px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      ↩ Undo
                    </button>
                  )}
                  {rulerPoints.length > 0 && (
                    <button
                      onClick={() => setRulerPoints([])}
                      className="rounded px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-50"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-medium text-slate-400">Total</span>
                  <span className="text-sm font-bold text-red-600">{fmtKm(rulerTotalKm)}</span>
                </div>
              </div>

              {rulerOn && rulerPoints.length === 0 && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  Click on the map to place measurement points.
                </p>
              )}
              {!rulerOn && rulerPoints.length > 0 && (
                <p className="text-[10px] text-slate-400 leading-snug">
                  Measurement is finished. Turn the ruler back on to add more points.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Source site search — desktop only */}
        <div className="hidden md:block">
          <SearchPanel
            sourceHeaders={sourceHeaders}
            filteredSourceRows={filteredSourceRows}
            totalSourceRows={totalSourceRows}
            sourceSiteQuery={sourceSiteQuery}
            onSourceSiteQueryChange={onSourceSiteQueryChange}
            onFilterReset={onFilterReset}
          />
        </div>

        {/* Parameters — desktop only */}
        <div className="hidden md:block">
          <ParametersPanel
            thresholdKm={thresholdKm}
            onThresholdKmChange={onThresholdKmChange}
            maxNeighbors={maxNeighbors}
            onMaxNeighborsChange={onMaxNeighborsChange}
            minVertices={minVertices}
            onMinVerticesChange={onMinVerticesChange}
            open={paramsOpen}
            onToggle={() => setParamsOpen((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}
