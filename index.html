import type { Point } from './geo';

/**
 * Voronoi cell for one seed, built by successively clipping a starting disc with the
 * perpendicular bisector half-plane between the seed and every other site.
 * Work is done in a local km plane centred on the seed, then converted back to lon/lat.
 */
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON = 111.32;

type XY = { x: number; y: number };

function clipHalfPlane(poly: XY[], a: number, b: number, c: number): XY[] {
  // keep points where a*x + b*y <= c
  if (!poly.length) return poly;
  const out: XY[] = [];
  const value = (p: XY) => a * p.x + b * p.y - c;

  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dc = value(cur);
    const dn = value(nxt);
    if (dc <= 0) out.push(cur);
    if ((dc < 0 && dn > 0) || (dc > 0 && dn < 0)) {
      const t = dc / (dc - dn);
      out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
    }
  }
  return out;
}

export function voronoiCell(
  source: Point,
  seeds: Point[],
  radiusKm: number,
  segments = 64,
): Point[] {
  const kmPerLon = KM_PER_DEG_LON * Math.cos((source.lat * Math.PI) / 180) || 1e-6;
  const toXY = (p: Point): XY => ({
    x: (p.lon - source.lon) * kmPerLon,
    y: (p.lat - source.lat) * KM_PER_DEG_LAT,
  });

  // Start from a disc of the site-to-site distance so unbounded cells stay finite.
  let poly: XY[] = Array.from({ length: segments }, (_, i) => {
    const t = (2 * Math.PI * i) / segments;
    return { x: radiusKm * Math.cos(t), y: radiusKm * Math.sin(t) };
  });

  for (const seed of seeds) {
    const p = toXY(seed);
    const d2 = p.x * p.x + p.y * p.y;
    if (d2 < 1e-9) continue; // the seed itself / duplicate coordinates
    if (Math.sqrt(d2) > 2 * radiusKm) continue; // bisector cannot touch the disc
    poly = clipHalfPlane(poly, p.x, p.y, d2 / 2);
    if (poly.length < 3) return [];
  }

  return poly.map((p, i) => ({
    site: `${source.site}_V${i + 1}`,
    lat: source.lat + p.y / KM_PER_DEG_LAT,
    lon: source.lon + p.x / kmPerLon,
  }));
}

/** Ray-casting test used to tag neighbours that fall inside the drawn polygon. */
export function pointInRing(lat: number, lon: number, ring: Point[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lon;
    const yi = ring[i].lat;
    const xj = ring[j].lon;
    const yj = ring[j].lat;
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
