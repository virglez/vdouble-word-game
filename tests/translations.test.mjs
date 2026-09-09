import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI_TEXT, LANGUAGE_OPTIONS } from '../data/ui_text.ts';
test('Todos los idiomas incluyen los textos que necesitan las pantallas', () => {
  const source = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
  const keys = new Set([...source.matchAll(/\bt\.([A-Za-z]\w*)/g)].map(match => match[1]));
  for (const { code } of LANGUAGE_OPTIONS) {
    for (const key of keys) assert.ok(typeof UI_TEXT[code][key] === 'string' && UI_TEXT[code][key].length > 0, `${code}: ${key}`);
  }
});
