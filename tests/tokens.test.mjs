import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HEX = /^#[0-9a-f]{6}$/i;
const MIN_RATIO = [['--sky-text', 4.5], ['--sky-series-', 3]];
const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function tokens(re, scheme) {
  const m = css.match(re);
  assert.ok(m, `tokens.css has no ${scheme} :root block`);
  return new Map([...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

const light = tokens(/^:root\s*\{([^}]*)\}/m, 'light');
const dark = tokens(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/, 'dark');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function checkContrast(scheme, map) {
  const bg = map.get('--sky-bg');
  assert.match(bg ?? '', HEX, `--sky-bg in ${scheme} is not #rrggbb: ${bg}`);
  for (const [name, value] of map) {
    const min = MIN_RATIO.find(([prefix]) => name.startsWith(prefix))?.[1];
    if (min === undefined) continue;
    assert.match(value, HEX, `${name} in ${scheme} is not #rrggbb: ${value}`);
    const ratio = contrast(value, bg);
    assert.ok(ratio >= min, `${name} in ${scheme} is ${ratio.toFixed(2)}:1 against --sky-bg, needs ${min}:1`);
  }
}

test('every light colour is redefined in the dark scheme', () => {
  for (const [name, value] of light) {
    if (HEX.test(value)) assert.ok(dark.has(name), `${name} has no dark value`);
  }
});

test('text and series colours meet AA against --sky-bg', () => {
  checkContrast('light', light);
  checkContrast('dark', dark);
});

test('a text or series colour that is not #rrggbb fails', () => {
  for (const name of ['--sky-text', '--sky-series-1']) {
    const map = new Map([['--sky-bg', '#ffffff'], [name, 'red']]);
    assert.throws(() => checkContrast('light', map), new RegExp(`${name} in light is not #rrggbb`));
  }
});
