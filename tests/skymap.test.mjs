import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skymap } from '../skymap.js';

function render(points) {
  const el = { innerHTML: '' };
  skymap(el, points);
  return el.innerHTML;
}

function circles(html) {
  const re = /<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"[^>]*><title>([^<]*)<\/title>/g;
  return new Map([...html.matchAll(re)].map(([, cx, cy, r, id]) => [id, { cx: Number(cx), cy: Number(cy), r: Number(r) }]));
}

test('draws one circle per point', () => {
  const html = render([
    { id: 'a', ra: 10, dec: 0, mag: 1 },
    { id: 'b', ra: 20, dec: 10, mag: 2 },
    { id: 'c', ra: 30, dec: -10, mag: 3 },
  ]);
  assert.equal(html.match(/<circle/g).length, 3);
});

test('RA 0 is the right edge and higher RA sits further left', () => {
  const c = circles(render([
    { id: 'zero', ra: 0, dec: 0, mag: 1 },
    { id: 'ninety', ra: 90, dec: 0, mag: 1 },
    { id: 'oneighty', ra: 180, dec: 0, mag: 1 },
  ]));
  assert.equal(c.get('zero').cx, 360);
  assert.ok(c.get('oneighty').cx < c.get('ninety').cx);
});

test('a smaller mag gets a larger radius', () => {
  const c = circles(render([
    { id: 'bright', ra: 10, dec: 0, mag: 1 },
    { id: 'faint', ra: 20, dec: 0, mag: 5 },
  ]));
  assert.ok(c.get('bright').r > c.get('faint').r);
});

test('an href row is linked and escaped; a plain row is not', () => {
  const html = render([{ id: 'x"<y', ra: 0, dec: 0, mag: 1, href: '/o?a=1&b="<' }]);
  assert.match(html, /<a href="\/o\?a=1&amp;b=&quot;&lt;"><circle [^>]*><title>x&quot;&lt;y<\/title><\/circle><\/a>/);
  const plain = render([{ id: 'p', ra: 0, dec: 0, mag: 1 }]);
  assert.match(plain, /<circle [^>]*><title>p<\/title><\/circle><\/svg>$/);
  assert.doesNotMatch(plain, /<a\b/);
});

test('empty input shows the empty-data message and no svg', () => {
  assert.equal(render([]), '<p class="sky-empty">No data</p>');
});
