# Site Neighbour Polygon Builder

A browser-based GIS tool for finding neighbour sites around each source, calculating site-to-site distances, drawing one convex-hull polygon per eligible source, inspecting results on an interactive map, and exporting CSV and KMZ files.

All uploaded site data is processed locally in the browser. It is not sent to an application server.

## Contents

- [Features](#features)
- [Input Files](#input-files)
- [Quick Start](#quick-start)
- [Parameter Guide](#parameter-guide)
- [Polygon Rules](#polygon-rules)
- [Map Guide](#map-guide)
- [Ruler Guide](#ruler-guide)
- [Neighbour Table](#neighbour-table)
- [Export Guide](#export-guide)
- [Desktop and Mobile](#desktop-and-mobile)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)
- [Developer Guide](#developer-guide)

## Features

- Separate Source and Neighbour file inputs.
- CSV, TXT, XLS, and XLSX support.
- Automatic field detection and manual column mapping.
- Haversine source-to-neighbour distance calculation.
- Configurable distance, maximum site count, and source-match requirement.
- Nearest-first neighbour ordering.
- One convex-hull polygon per eligible source site.
- Polygon area and perimeter calculations.
- `edge`, `inside`, and `outside` neighbour classification.
- Source-name matching between the two input files.
- Interactive source search and neighbour table.
- Map, Street, Satellite, and Topographic basemaps.
- Desktop multi-point ruler with preview, segment distances, and total distance.
- CSV result export.
- Polygon-only and polygon-with-sites KMZ export.
- Responsive desktop and mobile layouts.

## Input Files

### Supported Formats

- `.csv`
- `.txt`
- `.xls`
- `.xlsx`

For Excel files, the first non-empty worksheet is used. Its first non-empty row is treated as the header row.

### Required Fields

Both files must contain the following information:

| Field | Description | Example |
| --- | --- | --- |
| Site | Site name or identifier | `YGN00023` |
| Latitude | WGS84 latitude | `16.8661` |
| Longitude | WGS84 longitude | `96.1951` |

Latitude must be between `-90` and `90`. Longitude must be between `-180` and `180`. Invalid coordinate rows are skipped.

Example CSV:

```csv
Site,Lat,Long
YGN00023,16.866100,96.195100
YGN00024,16.873500,96.207800
```

The exact column names and order may differ. Select the correct fields in the mapping controls after upload.

### Source File

Each valid Source row becomes a source site. The application attempts to create one independent polygon for every source site.

### Neighbour File

Each valid Neighbour row becomes a candidate neighbour tested against every source site.

A neighbour whose name also appears in the Source file is a **source-matched neighbour**. Matching ignores letter case and surrounding spaces.

## Quick Start

1. Open the form with the menu icon.
2. Upload the Source file.
3. Upload the Neighbour file.
4. Review the Source and Neighbour field mappings.
5. Map Site, Lat, and Long correctly.
6. Open Parameter on mobile, or use the floating Parameters panel on desktop.
7. Enter the source-to-neighbour distance.
8. Set the maximum sites per polygon.
9. Set the minimum source-matched neighbours.
10. Search or click a source site to inspect it.
11. Download CSV or export KMZ.

## Upload and Mapping Guide

Drag a supported file onto the related upload area or click it to browse. The status badge shows the number of successfully mapped records. Use **clear** to remove a file.

Mapping controls appear only after the corresponding file is uploaded:

- **Site**: site name or ID.
- **Lat**: latitude.
- **Long**: longitude.

Automatic detection recognizes common names including:

- Site: `site`, `site_name`, `siteid`, `cell`, `name`, `id`, `node`
- Latitude: `lat`, `latitude`, `y`, `site_lat`
- Longitude: `lon`, `long`, `lng`, `longitude`, `x`, `site_long`

If no sites appear after upload, check these mappings first.

## Parameter Guide

Click the Parameters heading to show or hide the controls.

### Source-to-Neighbour Site Distance

The maximum great-circle distance from a source site to a neighbour site, in kilometres.

```text
Keep neighbour when distance(source, neighbour) <= configured distance
```

The Haversine formula is used with a mean Earth radius of `6371.0088 km`.

### Max Sites per Polygon

The maximum total number of points used for one polygon. The source point is always included.

```text
Max sites 20 = 1 source + up to 19 nearest neighbours
```

`0` means unlimited. Neighbours are sorted nearest-first before this limit is applied.

### Min Source-Matched Neighbours

The minimum number of selected neighbours whose names also exist in the complete Source list.

Example:

- Required minimum: `3`
- Selected neighbours also in Source file: `2`
- Result: no polygon is drawn.

Numeric inputs may be cleared while editing. An empty distance is treated as `0`, an empty maximum as unlimited, and an empty minimum as `0` until another value is entered.

## Polygon Rules

### Polygon Type

The application currently uses **convex hull only**. A convex hull is the smallest convex shape enclosing the source point and selected neighbour points.

### Processing Sequence

For each source site, the tool:

1. Measures distance to all neighbour candidates.
2. Keeps candidates inside the distance limit.
3. Sorts candidates nearest-first.
4. Applies the maximum site-count rule.
5. Counts selected neighbours also present in the Source file.
6. Checks the minimum source-match requirement.
7. Builds the convex hull when eligible.
8. Calculates polygon area and perimeter.
9. Classifies neighbours relative to the polygon.

### Position Labels

- `edge`: the neighbour is a convex-hull vertex.
- `inside`: the neighbour lies inside the polygon but is not an outer vertex.
- `outside`: no valid polygon contains the point, commonly because the source failed the minimum source-match rule.

Area is measured in square kilometres and perimeter in kilometres.

## Map Guide

### Default View

The map remains visible before upload and opens near Yangon:

```text
Latitude: 16.8661
Longitude: 96.1951
```

### Colours

- Source sites: green (`#22c55e`).
- Regular neighbours: red (`#ef4444`).
- Neighbours also present in the Source list: green.
- Polygon colours rotate through the built-in palette.

### Basemaps

- **Map**: light CARTO map.
- **Street**: OpenStreetMap.
- **Satellite**: Esri World Imagery.
- **Topo**: OpenTopoMap.

On mobile, tap the map thumbnail to expand the thumbnail selector. On desktop, use the map selector in the upper-right controls.

### Search and Selection

Enter part or all of a source name in **Filter source site**.

- Search is case-insensitive.
- An exact match is preferred over a partial match.
- Search selects a source without removing other sources from calculations.
- The selected source, neighbours, and polygon are isolated.
- The neighbour table opens automatically.

You may also click a source marker or polygon. Close the table with its top-right close button.

### Tooltips

- Source names are permanently labelled.
- Neighbour tooltips show name, distance, and bearing.
- Polygon tooltips show source name, neighbour count, and area.

## Ruler Guide

The ruler is available on desktop and hidden on mobile.

### Measure Distance

1. Turn on **Ruler**.
2. Click the map to place the first point.
3. Move the pointer to see a live preview.
4. Click again to add another point.
5. Continue for a multi-segment path.
6. Click **Done** to stop drawing while keeping the measurement visible.

### Ruler Output and Actions

- Points are numbered.
- Each segment displays its distance.
- The panel lists segment distances and their total.
- Values below 1 km display in metres.
- Up to 20 points are supported.
- **Undo** removes the latest point.
- **Clear** removes the entire path.
- Turning the ruler on again continues the existing path.

## Neighbour Table

The table opens after selecting or searching a source.

| Column | Meaning |
| --- | --- |
| `#` | Neighbour rank after nearest-first sorting |
| `Neighbour site` | Neighbour identifier |
| `Source` | `YES` when the neighbour name exists in the Source list; otherwise `NO` |
| `Lat` | Neighbour latitude |
| `Long` | Neighbour longitude |
| `Site-to-site distance (km)` | Haversine distance from the selected source |
| `In polygon` | `edge`, `inside`, or `outside` |

## Export Guide

Only source sites with valid polygons are included in KMZ exports. Each eligible source is exported as a separate KMZ inside a ZIP archive.

### KMZ: Polygon Only

- Contains only polygon geometry.
- Contains no source or neighbour point markers.
- Output archive: `polygons_only_kmz.zip`.
- Each KMZ contains exactly one polygon.

### KMZ: Polygon + Sites

- Contains one polygon.
- Contains the source marker.
- Contains all selected neighbour markers.
- Output archive: `polygons_with_sites_kmz.zip`.

Polygon KMZ extended data includes source coordinates, neighbour count, polygon vertices, area, perimeter, and minimum/average/maximum distances.

Open KMZ files in Google Earth or compatible GIS software.

### CSV

CSV export creates one row per selected source-neighbour relationship.

| Column | Meaning |
| --- | --- |
| `source_site` | Source identifier |
| `neighbour_site` | Neighbour identifier |
| `source` | `YES` when the neighbour is also in the Source list |
| `lat` | Neighbour latitude |
| `long` | Neighbour longitude |
| `site_to_site_distance_km` | Source-to-neighbour distance |
| `in_polygon` | `edge`, `inside`, or `outside` |
| `remark` | Polygon eligibility result |

Remark values:

- `OK`: a polygon was generated.
- `Don't have min source-matched neighbours`: minimum match rule was not met.
- `No neighbour site within distance`: no candidate was found inside the distance threshold.

## Desktop and Mobile

### Desktop

- Upload and mapping panel on the left.
- Map selector, ruler, search, and Parameters controls float over the map.
- KMZ and CSV controls are in the header.
- The menu icon collapses the left panel.

### Mobile

- Header and menu remain visible.
- The form opens over the map.
- `UPLOAD` contains file inputs and mappings.
- `PARAMETER` contains search, parameters, KMZ modes, and CSV download.
- Layer selection uses a collapsed map thumbnail that expands into visual choices.
- The ruler is hidden.
- Export controls are removed from the mobile header.

## Troubleshooting

### No Sites Appear

- Confirm both files loaded.
- Verify Site, Lat, and Long mappings.
- Confirm coordinates use decimal degrees.
- Check that latitude and longitude are not swapped.

### No Polygon Is Drawn

- Increase the source-to-neighbour distance.
- Increase maximum sites per polygon.
- Reduce minimum source-matched neighbours.
- Confirm site names match between files except for case and outer spaces.
- Review the CSV `remark` value.

### Search Does Not Find a Source

- Confirm the Source Site mapping.
- Search uses the mapped Source site-name field.
- Try a shorter partial site name.

### Map Tiles Do Not Load

Basemaps require internet access. Check firewall, ad-blocking, and access to CARTO, OpenStreetMap, Esri, and OpenTopoMap.

### Excel Data Is Incorrect

- The first non-empty worksheet is used.
- The first non-empty row must contain headers.
- Remove merged title cells above the table when possible.

### Export Is Disabled

- KMZ requires at least one valid polygon.
- CSV requires at least one valid source result.

## Technical Details

### Distance

```text
a = sin²(Δlat / 2) + cos(lat1) × cos(lat2) × sin²(Δlon / 2)
c = 2 × asin(min(1, √a))
distance = 6371.0088 × c
```

### Bearing

Initial source-to-neighbour bearing is normalized to `0–360°` and appears in map tooltips.

### Convex Hull

The application uses Andrew's monotone-chain algorithm. Duplicate coordinates are removed before hull construction.

### Polygon Area and Perimeter

Area uses a spherical polygon formula. Perimeter is the sum of Haversine distances around the ring.

### Point Classification

A ray-casting point-in-polygon test identifies interior points. Hull vertices are labelled `edge` before the interior test.

## Privacy and Limitations

### Privacy

- Site files are processed locally in the browser.
- No application API uploads source or neighbour data.
- Basemap providers receive ordinary tile requests, including requested tile coordinates and normal network information.

### Limitations

- Large datasets use an all-source-to-all-neighbour scan and may require significant CPU time.
- Convex hulls cannot represent concave boundaries.
- Calculations use spherical approximations rather than a local projected CRS.
- Antimeridian-crossing polygons are not supported.
- KMZ includes only eligible sources with valid polygons.
- Basemaps require an internet connection.

## Developer Guide

### Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Leaflet and React-Leaflet
- PapaParse
- SheetJS `xlsx`
- JSZip
- `vite-plugin-singlefile`

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

The production build is written to `dist/index.html` as a single-file application.

### Preview

```bash
npm run preview
```

### Main Files

| File | Purpose |
| --- | --- |
| `src/App.tsx` | State, responsive layout, upload flow, table, exports |
| `src/components/MapView.tsx` | Map, basemaps, markers, polygons, ruler |
| `src/components/FileCard.tsx` | File upload and status |
| `src/components/ControlPanels.tsx` | Shared search and parameter controls |
| `src/lib/csv.ts` | File parsing and CSV export |
| `src/lib/geo.ts` | Distance, bearing, hull, area, and results |
| `src/lib/kmz.ts` | KML/KMZ generation and export modes |
| `src/lib/colors.ts` | Default colours and polygon palette |
| `src/lib/voronoi.ts` | Point-in-ring and supporting geometry helpers |

### Current Defaults

| Setting | Default |
| --- | --- |
| Source-to-neighbour distance | `5 km` |
| Max sites per polygon | `20` |
| Min source-matched neighbours | `3` |
| Include source point | Yes |
| Source colour | Green |
| Neighbour colour | Red |
| Polygon type | Convex hull |
| Map center | Yangon |

Always verify changes with:

```bash
npm run build
```