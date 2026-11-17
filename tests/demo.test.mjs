import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('demo renders all five exports from its one module script', async () => {
  const html = read('demo.html');
  assert.match(html, /<link rel="stylesheet" href="\.\/tokens\.css">/);
  assert.equal(html.split('<script').length - 1, 1);
  assert.doesNotMatch(html, /\bsrc=|https?:/);
  const [, script] = html.match(/<script type="module">([\s\S]*)<\/script>/);
  for (const f of ['charts', 'skymap']) assert.ok(script.includes(`from './${f}.js'`), f);
  const file = join(mkdtempSync(join(tmpdir(), 'sky-ui-demo-')), 'demo.mjs');
  writeFileSync(file, script.replace(/'\.\/(charts|skymap)\.js'/g, (_, f) => `'${new URL(`../${f}.js`, import.meta.url)}'`));
  const els = {};
  globalThis.document = { getElementById: (id) => (els[id] ??= { innerHTML: '' }) };
  const names = Object.keys({ ...(await import('../charts.js')), ...(await import('../skymap.js')) });
  for (const name of names) assert.match(script, new RegExp(`^${name}\\(document\\.getElementById\\('${name}'\\)`, 'm'), name);
  await import(pathToFileURL(file).href);
  assert.equal(Object.keys(els).length, names.length);
  for (const [id, el] of Object.entries(els)) {
    assert.ok(html.includes(`id="${id}"`), `no container for ${id}`);
    assert.match(el.innerHTML, /^<svg/, id);
    assert.doesNotMatch(el.innerHTML, /No data/, id);
  }
});

test('README names every export and the setup steps', async () => {
  const readme = read('README.md');
  const names = Object.keys({ ...(await import('../charts.js')), ...(await import('../skymap.js')) });
  for (const name of names) assert.ok(readme.includes(`${name}(`), `README lacks ${name}(`);
  for (const s of ['git submodule add', 'http.server']) assert.ok(readme.includes(s), `README lacks ${s}`);
});
