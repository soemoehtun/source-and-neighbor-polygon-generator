export type Point = {
  site: string;
  lat: number;
  lon: number;
  raw?: Record<string, string>;
};

export type NeighborHit = Point & { distanceKm: number; bearing: number; inPolygon: boolean };

export type PolygonMode = 'hull' | 'voronoi';

export type SourceResult = {
  source: Point;
  neighbors: NeighborHit[];
  hull: Point[];
  areaKm2: number;
  perimeterKm: number;
  maxDistanceKm: number;
  minDistanceKm: number;
  avgDistanceKm: number;
  centroid: { lat: number; lon: number };
  /** Matched neighbours whose site name is also present in the source list. */
  sourceMatchedNeighbours: number;
};

import { pointInRing, voronoiCell } from './voronoi';

const R = 6371.0088; // mean earth radius km
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const dLon = toRad(bLon - aLon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Andrew's monotone chain convex hull on lon/lat (counter-clockwise). */
export function convexHull(points: Point[]): Point[] {
  const uniq = new Map<string, Point>();
  points.forEach((p) => uniq.set(`${p.lon.toFixed(7)},${p.lat.toFixed(7)}`, p));
  const pts = [...uniq.values()].sort((a, b) => (a.lon === b.lon ? a.lat - b.lat : a.lon - b.lon));
  if (pts.length < 3) return pts;

  const cross = (o: Point, a: Point, b: Point) =>
    (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);

  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Spherical polygon area in km² (ring not closed). */
export function polygonAreaKm2(ring: Point[]): number {
  if (ring.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    total +=
      toRad(p2.lon - p1.lon) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((total * R * R) / 2);
}

export function polygonPerimeterKm(ring: Point[]): number {
  if (ring.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    total += haversineKm(p1.lat, p1.lon, p2.lat, p2.lon);
  }
  return total;
}

export type BuildOptions = {
  thresholdKm: number;
  maxNeighbors: number; // 0 = unlimited
  includeSourceInPolygon: boolean;
  minNeighborsForPolygon: number;
  polygonMode: PolygonMode;
};

export function buildResults(
  sources: Point[],
  neighbors: Point[],
  opts: BuildOptions,
): SourceResult[] {
  // Voronoi cells are defined against every known site, not just the matched ones.
  const seeds: Point[] = opts.polygonMode === 'voronoi' ? [...sources, ...neighbors] : [];

  // Names present in the source list — used to count "source-matched" neighbours.
  const sourceNameSet = new Set(sources.map((s) => s.site.trim().toLowerCase()));

  return sources.map((src) => {
    let hits: NeighborHit[] = [];
    for (const n of neighbors) {
      const d = haversineKm(src.lat, src.lon, n.lat, n.lon);
      if (d <= opts.thresholdKm) {
        hits.push({
          ...n,
          distanceKm: d,
          bearing: bearingDeg(src.lat, src.lon, n.lat, n.lon),
          inPolygon: false,
        });
      }
    }
    hits.sort((a, b) => a.distanceKm - b.distanceKm);
    if (opts.maxNeighbors > 0) {
      // Max counts source + neighbours together (your confirmed definition).
      const allowedNeighbours = opts.includeSourceInPolygon
        ? Math.max(0, opts.maxNeighbors - 1)
        : opts.maxNeighbors;
      hits = hits.slice(0, allowedNeighbours);
    }

    const polyPoints: Point[] = opts.includeSourceInPolygon ? [src, ...hits] : [...hits];

    // Confirmed rule: a polygon is only drawn when at least `minNeighborsForPolygon`
    // of this source's matched neighbour sites are ALSO source sites (same site name).
    const sourceMatchedNeighbours = hits.filter((h) => sourceNameSet.has(h.site.trim().toLowerCase())).length;

    let hull: Point[] = [];
    if (opts.polygonMode === 'voronoi') {
      hull = voronoiCell(src, seeds, opts.thresholdKm);
    } else if (sourceMatchedNeighbours >= opts.minNeighborsForPolygon) {
      hull = convexHull(polyPoints);
    }

    hits = hits.map((h) => ({
      ...h,
      inPolygon:
        hull.length >= 3 &&
        (hull.some((v) => v.site === h.site) || pointInRing(h.lat, h.lon, hull)),
    }));

    const areaKm2 = polygonAreaKm2(hull);
    const perimeterKm = polygonPerimeterKm(hull);

    const dists = hits.map((h) => h.distanceKm);
    const centLat = polyPoints.reduce((s, p) => s + p.lat, 0) / (polyPoints.length || 1);
    const centLon = polyPoints.reduce((s, p) => s + p.lon, 0) / (polyPoints.length || 1);

    return {
      source: src,
      neighbors: hits,
      hull,
      areaKm2,
      perimeterKm,
      maxDistanceKm: dists.length ? Math.max(...dists) : 0,
      minDistanceKm: dists.length ? Math.min(...dists) : 0,
      avgDistanceKm: dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 0,
      centroid: { lat: polyPoints.length ? centLat : src.lat, lon: polyPoints.length ? centLon : src.lon },
      sourceMatchedNeighbours,
    };
  });
}
