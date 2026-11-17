# sky-ui

Shared tokens, chart kit and sky map for the CaliperForge space pages (neo-watch, rubin-alert-monitor).

## Usage as a submodule

```sh
git submodule add https://github.com/caliperforge/sky-ui.git sky-ui
```

```html
<link rel="stylesheet" href="sky-ui/tokens.css">
<script type="module">
  import { line, bars, stacked, tile } from './sky-ui/charts.js';
  import { skymap } from './sky-ui/skymap.js';
</script>
```

## Exports

Each export replaces `el.innerHTML`: an SVG, or "No data" for empty rows. `opts` is `{ title, xLabel, yLabel }`. A non-finite chart value throws `TypeError`.

- `line(el, rows, opts = {})`: rows `{ x, y }`
- `tile(el, rows, opts = {})`: rows `{ x, y }`, the last `y` shown large
- `bars(el, rows, opts = {})`: rows `{ label, value }`
- `stacked(el, rows, opts = {})`: rows `{ label, values: { <series>: number } }`
- `skymap(el, points)`: points `{ id, ra, dec, mag, href? }`, `ra` in degrees 0–360, `dec` in degrees -90–90

Chrome blocks modules from file://, so open demo.html there through a static server (`python3 -m http.server`); Firefox opens it from disk.
