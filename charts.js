const W = 320, H = 200, L = 40, R = 10, T = 28, B = 40, PW = W - L - R;
// Colours go in style, because presentation attributes such as fill do not resolve var().
const TEXT = 'var(--sky-text)', MUTED = 'var(--sky-text-muted)', AXIS = 'var(--sky-axis)';
const ENTITY = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ENTITY[c]);
const n = (v) => Math.round(v * 10) / 10;
const series = (i) => `var(--sky-series-${i % 6 + 1})`;
const tip = (label, value) => `<title>${esc(label)}: ${value}</title>`;
const text = (x, y, s, fill, anchor = 'middle', attrs = '') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill: ${fill}"${attrs}>${esc(s)}</text>`;
const rect = (x, w, y0, y1, fill, title) =>
  `<rect x="${n(x + w * 0.1)}" y="${Math.min(y0, y1)}" width="${n(w * 0.8)}" height="${n(Math.abs(y1 - y0))}" style="fill: ${fill}">${title}</rect>`;
const bandTicks = (rows, bw) => rows.map((r, i) => [n(L + (i + 0.5) * bw), r.label]);

function svg(opts, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-size="12" style="font-family: var(--sky-font-sans)">`
    + text(W / 2, 18, opts.title, TEXT, 'middle', ' font-weight="bold"') + inner + '</svg>';
}

function draw(el, rows, opts, values, render) {
  rows.forEach((r, i) => {
    if (!values(r).every(Number.isFinite)) throw new TypeError(`row ${i} has a value that is not a finite number`);
  });
  el.innerHTML = rows.length ? render()
    : svg(opts, `<text class="sky-empty" x="${W / 2}" y="${H / 2}" text-anchor="middle" style="fill: ${MUTED}">No data</text>`);
}

function frame(opts, vals, xticks, marks, top = T) {
  const lo = vals.reduce((a, v) => Math.min(a, v), 0), hi = vals.reduce((a, v) => Math.max(a, v), 0);
  const sy = (v) => n(top + (hi - v) / (hi - lo || 1) * (H - top - B));
  const midY = (top + H - B) / 2;
  return svg(opts, `<line x1="${L}" y1="${top}" x2="${W - R}" y2="${top}" style="stroke: var(--sky-grid)"/>`
    + `<line x1="${L}" y1="${top}" x2="${L}" y2="${H - B}" style="stroke: ${AXIS}"/>`
    + `<line x1="${L}" y1="${sy(0)}" x2="${W - R}" y2="${sy(0)}" style="stroke: ${AXIS}"/>`
    + text(L - 4, sy(0) + 4, 0, MUTED, 'end') + text(L - 4, top + 4, hi, MUTED, 'end')
    + xticks.map(([x, s]) => text(x, H - B + 14, s, MUTED)).join('')
    + text(L + PW / 2, H - 6, opts.xLabel, TEXT)
    + text(12, midY, opts.yLabel, TEXT, 'middle', ` transform="rotate(-90 12 ${midY})"`)
    + marks(sy));
}

function trend(el, rows, opts, big) {
  draw(el, rows, opts, (r) => [r.y], () => {
    const xs = rows.map((_, i) => n(L + (rows.length > 1 ? i / (rows.length - 1) : 0.5) * PW));
    const ends = [...new Set([0, rows.length - 1])].map((i) => [xs[i], rows[i].x]);
    const value = big ? text(W / 2, T + 34, rows[rows.length - 1].y, TEXT, 'middle', ' font-size="32"') : '';
    return frame(opts, rows.map((r) => r.y), ends, (sy) => value
      + `<polyline points="${rows.map((r, i) => `${xs[i]},${sy(r.y)}`).join(' ')}" fill="none" style="stroke: ${series(0)}"/>`
      + rows.map((r, i) => `<circle cx="${xs[i]}" cy="${sy(r.y)}" r="3" style="fill: ${series(0)}">${tip(r.x, r.y)}</circle>`).join(''),
    big ? T + 44 : T);
  });
}

export const line = (el, rows, opts = {}) => trend(el, rows, opts, false);
export const tile = (el, rows, opts = {}) => trend(el, rows, opts, true);

export function bars(el, rows, opts = {}) {
  draw(el, rows, opts, (r) => [r.value], () => {
    const bw = PW / rows.length;
    return frame(opts, rows.map((r) => r.value), bandTicks(rows, bw),
      (sy) => rows.map((r, i) => rect(L + i * bw, bw, sy(0), sy(r.value), series(0), tip(r.label, r.value))).join(''));
  });
}

export function stacked(el, rows, opts = {}) {
  draw(el, rows, opts, (r) => Object.values(r.values), () => {
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r.values)))];
    const bw = PW / rows.length;
    const segs = rows.map((r) => {
      let acc = 0;
      return keys.flatMap((k, j) => Object.hasOwn(r.values, k) ? [{ j, k, from: acc, to: (acc += r.values[k]) }] : []);
    });
    return frame(opts, segs.flat().map((s) => s.to), bandTicks(rows, bw), (sy) => segs.flatMap((row, i) => row.map((s) =>
      rect(L + i * bw, bw, sy(s.from), sy(s.to), series(s.j), tip(`${rows[i].label} ${s.k}`, rows[i].values[s.k])))).join(''));
  });
}
