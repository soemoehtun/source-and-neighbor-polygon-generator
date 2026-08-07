// Deterministic pseudo random so sample data is stable between reloads
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTER = { lat: -6.2, lon: 106.82 }; // Jakarta

export function sampleSourceCsv(): string {
  const rnd = mulberry32(7);
  const lines = ['Site,Long,Lat'];
  for (let i = 0; i < 6; i++) {
    const lat = CENTER.lat + (rnd() - 0.5) * 0.32;
    const lon = CENTER.lon + (rnd() - 0.5) * 0.32;
    lines.push(`SRC_${String(i + 1).padStart(3, '0')},${lon.toFixed(6)},${lat.toFixed(6)}`);
  }
  return lines.join('\n');
}

export function sampleNeighbourCsv(): string {
  const rnd = mulberry32(21);
  const lines = ['Site,Long,Lat'];
  for (let i = 0; i < 160; i++) {
    const lat = CENTER.lat + (rnd() - 0.5) * 0.45;
    const lon = CENTER.lon + (rnd() - 0.5) * 0.45;
    lines.push(`NBR_${String(i + 1).padStart(3, '0')},${lon.toFixed(6)},${lat.toFixed(6)}`);
  }
  return lines.join('\n');
}
