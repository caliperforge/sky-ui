import { test } from 'node:test';
import assert from 'node:assert/strict';
import { line, bars, stacked, tile } from '../charts.js';

const opts = { title: 'Kp index', xLabel: 'Time', yLabel: 'Kp' };
const points = [{ x: '00:00', y: 2 }, { x: '03:00', y: 5 }, { x: '06:00', y: 3 }];
const counts = [{ label: 'M', value: 4 }, { label: 'X', value: 1 }];
const stacks = [{ label: 'Mon', values: { low: 1, high: 2 } }, { label: 'Tue', values: { high: 4, low: 3 } }];

function render(chart, rows, o = opts) {
  const el = { innerHTML: '' };
  chart(el, rows, o);
  return el.innerHTML;
}

const count = (svg, tag) => svg.split(`<${tag} `).length - 1;
const titles = (svg) => [...svg.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1]);

test('each chart draws one mark per row or segment', () => {
  const l = render(line, points);
  assert.equal(count(l, 'circle'), 3);
  assert.equal(count(l, 'polyline'), 1);
  assert.equal(count(render(bars, counts), 'rect'), 2);
  assert.equal(count(render(stacked, stacks), 'rect'), 4);
  const t = render(tile, points);
  assert.equal(count(t, 'circle'), 3);
  assert.match(t, /font-size="32">3<\/text>/);
});

test('each chart shows its title, axis titles and x ticks', () => {
  const ends = ['00:00', '06:00'];
  for (const [chart, rows, ticks] of [[line, points, ends], [tile, points, ends], [bars, counts, ['M', 'X']], [stacked, stacks, ['Mon', 'Tue']]]) {
    const svg = render(chart, rows);
    for (const s of [opts.title, opts.xLabel, opts.yLabel, ...ticks]) assert.match(svg, new RegExp(`>${s}</text>`), `${chart.name} lacks ${s}`);
  }
  assert.doesNotMatch(render(line, points), />03:00<\/text>/);
  assert.doesNotMatch(render(tile, points), />03:00<\/text>/);
});

test('each mark carries its row value in a title', () => {
  const trend = ['00:00: 2', '03:00: 5', '06:00: 3'];
  assert.deepEqual(titles(render(line, points)), trend);
  assert.deepEqual(titles(render(tile, points)), trend);
  assert.deepEqual(titles(render(bars, counts)), ['M: 4', 'X: 1']);
  assert.deepEqual(titles(render(stacked, stacks)), ['Mon low: 1', 'Mon high: 2', 'Tue low: 3', 'Tue high: 4']);
});

test('empty rows show No data and no marks', () => {
  for (const chart of [line, bars, stacked, tile]) {
    const svg = render(chart, []);
    assert.match(svg, /class="sky-empty"[^>]*>No data<\/text>/);
    assert.match(svg, />Kp index<\/text>/);
    assert.doesNotMatch(svg, /<(circle|rect|polyline) /);
  }
});

test('a non-finite value throws and leaves innerHTML as it was', () => {
  const cases = [
    [line, [{ x: 'a', y: 1 }, { x: 'b', y: NaN }]],
    [tile, [{ x: 'a', y: 1 }, { x: 'b', y: '2' }]],
    [bars, [{ label: 'a', value: 1 }, { label: 'b', value: Infinity }]],
    [stacked, [{ label: 'a', values: { s: 1 } }, { label: 'b', values: { s: null } }]],
  ];
  for (const [chart, rows] of cases) {
    const el = { innerHTML: 'before' };
    assert.throws(() => chart(el, rows, opts), { name: 'TypeError', message: /row 1/ });
    assert.equal(el.innerHTML, 'before');
  }
});

test('markup in titles, labels and series names is escaped', () => {
  const o = { title: 'A & B', xLabel: '"x"', yLabel: '<y>' };
  const svg = render(stacked, [{ label: '<script>alert(1)</script>', values: { 'a&b': 1 } }], o);
  assert.doesNotMatch(svg, /<script>/);
  for (const s of ['A &amp; B', '&quot;x&quot;', '&lt;y&gt;', '&lt;script&gt;', 'a&amp;b']) assert.ok(svg.includes(s), `missing ${s}`);
});
