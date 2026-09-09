import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI_TEXT, LANGUAGE_OPTIONS } from '../data/ui_text.ts';

test('Portugués tiene traducciones propias en el CSV, sin depender del respaldo español', () => {
  const csv = readFileSync(new URL('../data/ui_text.csv', import.meta.url), 'utf8');
  const portugueseKeys = new Set([...csv.matchAll(/^([^,\r\n]+),pt(?:-[A-Za-z]+)?,/gm)].map(match => match[1]));
  for (const key of Object.keys(UI_TEXT.es)) assert.ok(portugueseKeys.has(key), `Falta traducción portuguesa: ${key}`);
  assert.equal(UI_TEXT.pt.newGame, 'Nova partida');
  assert.equal(UI_TEXT.pt.reviewTitle, 'Revejam os cartões');
  assert.equal(UI_TEXT.pt.rulesTitle1, 'Descrição');
  assert.equal(UI_TEXT.pt.cardCountLong, 'partida longa');
  assert.equal(UI_TEXT.pt.reviewConfirm.replace('{team}', 'Azul'), 'Confirmar e entregar a Azul');
  assert.equal(UI_TEXT.pt.instructionsRound.replace('{n}', '2'), 'RONDA 2 DE 3');
});
test('Todos los idiomas incluyen los textos que necesitan las pantallas', () => {
  const source = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
  const keys = new Set([...source.matchAll(/\bt\.([A-Za-z]\w*)/g)].map(match => match[1]));
  for (const { code } of LANGUAGE_OPTIONS) {
    for (const key of keys) assert.ok(typeof UI_TEXT[code][key] === 'string' && UI_TEXT[code][key].length > 0, `${code}: ${key}`);
  }
});


test('English has explicit UI translations and translated labels for every card', async () => {
  const csv = readFileSync(new URL('../data/ui_text.csv', import.meta.url), 'utf8');
  const keys = new Set([...csv.matchAll(/^([^,\r\n]+),en(?:-[A-Za-z]+)?,/gm)].map(match => match[1]));
  for (const key of Object.keys(UI_TEXT.es)) {
    assert.ok(keys.has(key), `Missing English: ${key}`);
    assert.deepEqual(UI_TEXT.en[key].match(/\{\w+\}/g), UI_TEXT.es[key].match(/\{\w+\}/g), key);
  }
  assert.match(UI_TEXT.en.rulesDescription3, /gestures/);
  assert.match(UI_TEXT.en.setupSubtitle, /team names/);
  assert.match(UI_TEXT.en.confirmDiscardBody, /saved game/);
  assert.match(UI_TEXT.en.instructionsBody, /30 seconds/);
  assert.equal(UI_TEXT.es.createDeck, 'Crear partida');
  const { WORD_BANK } = await import('../data/wordBank.ts');
  for (const card of WORD_BANK) {
    assert.ok(card.categoryTranslations?.en, card.categoria);
    assert.ok(card.subcategoryTranslations?.en, card.subcategoria);
    assert.ok(UI_TEXT.en['cardType_' + card.tipo], card.tipo);
  }
});

test('Changing language translates default teams and preserves custom names', async () => {
  const { initialState, changeLanguage } = await import('../lib/game.ts');
  const en = changeLanguage(initialState, 'en');
  assert.equal(en.teams[0].name, 'Team Sun');
  assert.equal(changeLanguage(en, 'es').teams[1].name, 'Equipo Luna');
  const custom = { ...initialState, teams: [{ ...initialState.teams[0], customName: true }, { ...initialState.teams[1], name: 'Amigos' }] };
  assert.deepEqual(changeLanguage(custom, 'en').teams.map(t => t.name), ['Equipo Sol', 'Amigos']);
});
