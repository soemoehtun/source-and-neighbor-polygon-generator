import { Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { SourceResult, Point } from '../lib/geo';
import { colorFor, SOURCE_COLOR } from '../lib/colors';
import type { SiteStyle } from '../lib/colors';

export { colorFor };

const BASEMAPS = [
  {
    id: 'light',
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    swatch: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
  },
  {
    id: 'street',
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    swatch: 'linear-gradient(135deg,#e8f0d9,#cfe0bd)',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    swatch: 'linear-gradient(135deg,#2f4f2f,#16321f)',
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    swatch: 'linear-gradient(135deg,#334155,#0f172a)',
  },
] as const;

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
  thresholdKm: number;
  onThresholdKmChange: (value: number) => void;
  maxNeighbors: number;
  onMaxNeighborsChange: (value: number) => void;
  minVertices: number;
  onMinVerticesChange: (value: number) => void;
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
        scrollWheelZoom
      >
        <TileLayer key={active.id} attribution={active.attribution} url={active.url} />
        <FitBounds bounds={bounds} />
        <InvalidateSize />

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

      {/* Right-side stacked controls: basemap switcher, then source data filter */}
      <div className="absolute right-4 top-4 z-[1000] flex w-64 flex-col gap-2">
        {/* Google-Earth style basemap switcher */}
        <div className="flex gap-1 rounded-lg bg-white/95 p-1.5 shadow-lg ring-1 ring-slate-200">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBasemap(b.id)}
              className={`min-w-0 flex-1 rounded-md p-1 text-center transition ${
                basemap === b.id ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <span
                className={`block h-9 w-full rounded border-2 ${
                  basemap === b.id ? 'border-blue-600' : 'border-transparent'
                }`}
                style={{ background: b.swatch }}
              />
              <span
                className={`mt-1 block truncate text-[10px] font-semibold ${
                  basemap === b.id ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {b.label}
              </span>
            </button>
          ))}
        </div>

        {/* Source site search — same width as basemap switcher, stacked directly underneath (no overlap) */}
        <div className="rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-slate-200">
          <div className="relative">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
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
          {sourceHeaders.length > 0 && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              {filteredSourceRows} of {totalSourceRows} source rows
            </p>
          )}
          {sourceHeaders.length === 0 && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              Upload a source file to search its site names.
            </p>
          )}
        </div>

        {/* Parameters — below the source data filter */}
        <div className="rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Parameters</span>
          </div>
          <div className="space-y-3">
            <label className="block text-[11px] font-medium text-slate-600">
              Source-to-neighbour site distance
              <span className="float-right font-mono text-slate-400">{thresholdKm} km</span>
              <input
                type="range"
                min="0.1"
                max="50"
                step="0.1"
                value={thresholdKm}
                onChange={(e) => onThresholdKmChange(parseFloat(e.target.value))}
                className="mt-1.5 h-1 w-full accent-slate-900 appearance-none rounded-full bg-slate-200 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900"
              />
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={thresholdKm}
                onChange={(e) => onThresholdKmChange(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-900"
              />
            </label>

            <label className="block text-[11px] font-medium text-slate-600">
              Max sites per polygon <span className="font-normal text-slate-400">(0 = unlimited)</span>
              <input
                type="number"
                min="0"
                value={maxNeighbors}
                onChange={(e) => onMaxNeighborsChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-900"
              />
            </label>

            <label className="block text-[11px] font-medium text-slate-600">
              Min source-matched neighbours
              <input
                type="number"
                min="2"
                value={minVertices}
                onChange={(e) => onMinVerticesChange(Math.max(2, parseInt(e.target.value, 10) || 2))}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-slate-900"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
