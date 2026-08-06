import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Point, SourceResult } from './geo';

const SITE_KEYS = ['site', 'sitename', 'site_name', 'siteid', 'site_id', 'cell', 'name', 'id', 'node'];
const LAT_KEYS = ['lat', 'latitude', 'y', 'site_lat', 'lat_wgs84'];
const LON_KEYS = ['lon', 'long', 'lng', 'longitude', 'x', 'site_lon', 'site_long', 'lon_wgs84'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function pickKey(headers: string[], candidates: string[]): string | null {
  const map = new Map(headers.map((h) => [norm(h), h]));
  for (const c of candidates) {
    const hit = map.get(norm(c));
    if (hit) return hit;
  }
  // fuzzy: header contains candidate
  for (const h of headers) {
    const nh = norm(h);
    for (const c of candidates) if (nh.includes(norm(c))) return h;
  }
  return null;
}

export type ColumnMapping = {
  site: string;
  lat: string;
  lon: string;
};

export type ParseResult = {
  points: Point[];
  rows: Record<string, string>[];
  headers: string[];
  mapping: ColumnMapping;
  skipped: number;
  error?: string;
};

function parseRows(rows: Record<string, string>[], headers: string[]): ParseResult {
  if (!rows.length || !headers.length)
    return {
      points: [],
      rows: [],
      headers,
      mapping: { site: '', lat: '', lon: '' },
      skipped: 0,
      error: 'No rows found in file.',
    };

  const mapping = {
    site: pickKey(headers, SITE_KEYS) ?? '',
    lat: pickKey(headers, LAT_KEYS) ?? '',
    lon: pickKey(headers, LON_KEYS) ?? '',
  };
  const mapped = mapRowsToPoints(rows, mapping);
  return { ...mapped, rows, headers, mapping };
}

export function mapRowsToPoints(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Pick<ParseResult, 'points' | 'skipped' | 'error'> {
  if (!mapping.lat || !mapping.lon)
    return {
      points: [],
      skipped: 0,
      error: 'Choose both latitude and longitude columns in the Columns tab.',
    };

  const points: Point[] = [];
  let skipped = 0;
  rows.forEach((row, i) => {
    const lat = parseFloat(String(row[mapping.lat] ?? '').replace(',', '.'));
    const lon = parseFloat(String(row[mapping.lon] ?? '').replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      skipped++;
      return;
    }
    points.push({
      site: String(row[mapping.site] ?? '').trim() || `ROW_${i + 1}`,
      lat,
      lon,
      raw: row,
    });
  });
  return { points, skipped };
}

export function parseCsvText(text: string): ParseResult {
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const rows = (res.data || []).filter(Boolean);
  const headers = res.meta?.fields ?? [];
  return parseRows(rows, headers);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('Unable to read file'));
    r.readAsText(file);
  });
}

/** Reads CSV, TXT, XLS or XLSX and takes the first non-empty worksheet for Excel files. */
export async function parseInputFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
      return {
        points: [],
        rows: [],
        headers: [],
        mapping: { site: '', lat: '', lon: '' },
        skipped: 0,
        error: 'The workbook has no worksheets.',
      };
    const table = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    });
    const headerRow = table.find((row) => row.some((value) => String(value).trim() !== '')) ?? [];
    const headerIndex = table.indexOf(headerRow);
    const headers = headerRow.map((value, index) => String(value).trim() || `Column_${index + 1}`);
    const rows = table
      .slice(headerIndex + 1)
      .filter((row) => row.some((value) => String(value).trim() !== ''))
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '')])));
    return parseRows(rows, headers);
  }
  return parseCsvText(await readFileAsText(file));
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSummary(results: SourceResult[], sourceNames?: Set<string>) {
  const names = sourceNames ?? new Set(results.map((r) => r.source.site.trim().toLowerCase()));
  const rows: Record<string, string | number>[] = [];

  results.forEach((r) => {
    const remark = r.hull.length >= 3 ? 'OK' : "Don't have min source-matched neighbours";
    const onEdge = (site: string) => r.hull.length >= 3 && r.hull.some((v) => v.site === site);

    if (r.neighbors.length === 0) {
      rows.push({
        source_site: r.source.site,
        neighbour_site: '',
        source: '',
        lat: '',
        long: '',
        'site_to_site_distance_km': '',
        in_polygon: '',
        Remark: remark === 'OK' ? 'OK' : 'No neighbour site within distance',
      });
      return;
    }

    r.neighbors.forEach((n) => {
      const inPolyLabel = onEdge(n.site) ? 'edge' : n.inPolygon ? 'inside' : 'outside';
      rows.push({
        source_site: r.source.site,
        neighbour_site: n.site,
        source: names.has(n.site.trim().toLowerCase()) ? 'YES' : 'NO',
        lat: n.lat.toFixed(6),
        long: n.lon.toFixed(6),
        'site_to_site_distance_km': +n.distanceKm.toFixed(4),
        in_polygon: inPolyLabel,
        Remark: remark,
      });
    });
  });

  download('polygon_summary.csv', Papa.unparse(rows));
}

export function exportDetail(results: SourceResult[]) {
  const rows = results.flatMap((r) =>
    r.neighbors.map((n, i) => ({
      source_site: r.source.site,
      source_lat: r.source.lat,
      source_lon: r.source.lon,
      rank: i + 1,
      neighbor_site: n.site,
      neighbor_lat: n.lat,
      neighbor_lon: n.lon,
      distance_km: +n.distanceKm.toFixed(4),
      distance_m: Math.round(n.distanceKm * 1000),
      bearing_deg: +n.bearing.toFixed(1),
      in_polygon: n.inPolygon ? 'YES' : 'NO',
    })),
  );
  download('neighbour_distance_detail.csv', Papa.unparse(rows));
}

export function toWkt(r: SourceResult): string {
  if (r.hull.length < 3) return '';
  const ring = [...r.hull, r.hull[0]];
  return `POLYGON ((${ring.map((p) => `${p.lon} ${p.lat}`).join(', ')}))`;
}

export function exportGeoJson(results: SourceResult[]) {
  const fc = {
    type: 'FeatureCollection',
    features: results
      .filter((r) => r.hull.length >= 3)
      .map((r) => ({
        type: 'Feature',
        properties: {
          source_site: r.source.site,
          neighbor_count: r.neighbors.length,
          area_km2: +r.areaKm2.toFixed(6),
          perimeter_km: +r.perimeterKm.toFixed(4),
          max_distance_km: +r.maxDistanceKm.toFixed(4),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[...r.hull, r.hull[0]].map((p) => [p.lon, p.lat])],
        },
      })),
  };
  const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'polygons.geojson';
  a.click();
  URL.revokeObjectURL(url);
}
