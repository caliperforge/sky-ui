const R_MIN = 2;
const R_MAX = 8;
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);

function grid() {
  const parts = [];
  for (let ra = 0; ra < 360; ra += 30) {
    const x = 360 - ra;
    parts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="var(--sky-grid)"/>`,
      `<text x="${x}" y="192" text-anchor="middle" fill="var(--sky-text-muted)">${ra / 15}h</text>`,
    );
  }
  for (let dec = -60; dec <= 60; dec += 30) {
    const y = 90 - dec;
    parts.push(
      `<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="var(--sky-grid)"/>`,
      `<text x="-4" y="${y}" text-anchor="end" dominant-baseline="middle" fill="var(--sky-text-muted)">${dec}°</text>`,
    );
  }
  return parts.join('');
}

export function skymap(el, points) {
  if (points.length === 0) {
    el.innerHTML = '<p class="sky-empty">No data</p>';
    return;
  }
  const mags = points.map((p) => p.mag);
  const lo = Math.min(...mags);
  const hi = Math.max(...mags);
  const radius = (mag) => (hi === lo ? (R_MIN + R_MAX) / 2 : R_MIN + ((R_MAX - R_MIN) * (hi - mag)) / (hi - lo));
  const circles = points.map(({ id, ra, dec, mag, href }) => {
    const circle = `<circle cx="${360 - ra}" cy="${90 - dec}" r="${radius(mag)}" fill="var(--sky-series-1)"><title>${esc(id)}</title></circle>`;
    return href ? `<a href="${esc(href)}">${circle}</a>` : circle;
  });
  el.innerHTML = `<svg viewBox="-28 -10 398 212" font-size="8">${grid()}${circles.join('')}</svg>`;
}
