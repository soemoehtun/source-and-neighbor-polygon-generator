// Shared colour palette so the map, table and KMZ all match.
export const PALETTE = [
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#0ea5e9',
  '#22c55e',
  '#f43f5e',
  '#a855f7',
];

export const colorFor = (i: number) => PALETTE[i % PALETTE.length];

export type SiteStyle = {
  sourceColor: string;
  neighbourColor: string;
  polygonColor: string;
  polygonOpacity: number;
};

export const SOURCE_COLOR = '#22c55e'; // green
export const NEIGHBOUR_COLOR = '#ef4444'; // red

export function defaultSiteStyle(index: number): SiteStyle {
  return {
    sourceColor: SOURCE_COLOR,
    neighbourColor: NEIGHBOUR_COLOR,
    polygonColor: colorFor(index),
    polygonOpacity: 0.18,
  };
}
