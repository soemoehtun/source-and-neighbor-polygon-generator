import JSZip from 'jszip';
import type { SourceResult } from './geo';
import type { SiteStyle } from './colors';
import { defaultSiteStyle } from './colors';

const esc = (s: string | number) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeFilename = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'source_site';

/** Convert #rrggbb + alpha (0..1) into KML's aabbggrr colour string. */
function kmlColor(hex: string, alpha = 1): string {
  const validHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#2563eb';
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${a}${validHex.slice(5, 7)}${validHex.slice(3, 5)}${validHex.slice(1, 3)}`.toLowerCase();
}

function extendedData(r: SourceResult): string {
  const rows: [string, string | number][] = [
    ['Source site', r.source.site],
    ['Source latitude', r.source.lat.toFixed(6)],
    ['Source longitude', r.source.lon.toFixed(6)],
    ['Neighbour count', r.neighbors.length],
    ['Polygon vertices', r.hull.length],
    ['Polygon area (km2)', r.areaKm2.toFixed(6)],
    ['Perimeter (km)', r.perimeterKm.toFixed(4)],
    ['Min distance (km)', r.minDistanceKm.toFixed(4)],
    ['Avg distance (km)', r.avgDistanceKm.toFixed(4)],
    ['Max distance (km)', r.maxDistanceKm.toFixed(4)],
  ];
  const data = rows.map(([k, v]) => `<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`).join('');
  const table = rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('');
  return `<ExtendedData>${data}</ExtendedData><description><![CDATA[<table>${table}</table>]]></description>`;
}

/** What to include in the exported KMZ. */
export type KmzMode = 'polygon' | 'polygon+sites';

/** Each source KMZ has exactly one Polygon, optionally with its source and neighbour markers. */
export function buildSiteKml(
  result: SourceResult,
  style: SiteStyle,
  mode: KmzMode = 'polygon+sites',
): string {
  const withSites = mode === 'polygon+sites';

  const sourcePoint = withSites
    ? `<Placemark><name>${esc(result.source.site)}</name>` +
      `<Style><IconStyle><color>${kmlColor(style.sourceColor)}</color><scale>1.1</scale></IconStyle>` +
      `<LabelStyle><scale>0.9</scale></LabelStyle></Style>` +
      `<Point><coordinates>${result.source.lon},${result.source.lat},0</coordinates></Point></Placemark>`
    : '';

  const neighbourFolder = withSites
    ? `<Folder><name>Neighbours (${result.neighbors.length})</name>` +
      result.neighbors
        .map(
          (n) =>
            `<Placemark><name>${esc(n.site)}</name>` +
            `<Style><IconStyle><color>${kmlColor(style.neighbourColor)}</color><scale>0.75</scale></IconStyle></Style>` +
            `<description><![CDATA[${n.distanceKm.toFixed(4)} km from ${esc(result.source.site)}]]></description>` +
            `<Point><coordinates>${n.lon},${n.lat},0</coordinates></Point></Placemark>`,
        )
        .join('') +
      `</Folder>`
    : '';

  let polygon = '';
  if (result.hull.length >= 3) {
    const ring = [...result.hull, result.hull[0]];
    const coordinates = ring.map((p) => `${p.lon},${p.lat},0`).join(' ');
    polygon =
      `<Placemark><name>${esc(result.source.site)} polygon</name>` +
      `<Style><LineStyle><color>${kmlColor(style.polygonColor)}</color><width>2</width></LineStyle>` +
      `<PolyStyle><color>${kmlColor(style.polygonColor, style.polygonOpacity)}</color></PolyStyle></Style>` +
      extendedData(result) +
      `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing>` +
      `<coordinates>${coordinates}</coordinates>` +
      `</LinearRing></outerBoundaryIs></Polygon></Placemark>`;
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<name>${esc(result.source.site)}</name><Folder><name>${esc(result.source.site)}</name>` +
    `${sourcePoint}${neighbourFolder}${polygon}</Folder></Document></kml>`
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function siteKmzBlob(result: SourceResult, style: SiteStyle, mode: KmzMode): Promise<Blob> {
  const kmz = new JSZip();
  kmz.file('doc.kml', buildSiteKml(result, style, mode));
  return kmz.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/** Download one source site's single-polygon KMZ directly. */
export async function exportSiteKmz(
  result: SourceResult,
  index: number,
  style?: SiteStyle,
  mode: KmzMode = 'polygon+sites',
) {
  if (result.hull.length < 3) return;
  const suffix = mode === 'polygon' ? '_polygon' : '';
  triggerDownload(
    await siteKmzBlob(result, style ?? defaultSiteStyle(index), mode),
    `${safeFilename(result.source.site)}${suffix}.kmz`,
  );
}

/** Download a ZIP of individual KMZ files: exactly one eligible source polygon in each KMZ. */
export async function exportKmzBundle(
  results: SourceResult[],
  styleFor: (index: number) => SiteStyle = defaultSiteStyle,
  mode: KmzMode = 'polygon+sites',
) {
  const bundle = new JSZip();
  const eligible = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.hull.length >= 3);
  if (!eligible.length) return;

  const names = new Set<string>();
  for (const { result, index } of eligible) {
    const base = safeFilename(result.source.site);
    let filename = `${base}.kmz`;
    let suffix = 2;
    while (names.has(filename)) filename = `${base}_${suffix++}.kmz`;
    names.add(filename);
    bundle.file(filename, await siteKmzBlob(result, styleFor(index), mode));
  }
  triggerDownload(
    await bundle.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }),
    mode === 'polygon' ? 'polygons_only_kmz.zip' : 'polygons_with_sites_kmz.zip',
  );
}