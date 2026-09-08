import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, answer, correctReview, confirmReview, resetRound, finishTurn, buildDeck, normalizedWord, returnHome, resetForSetup } from '../lib/game.ts';

test('Volver al inicio cierra los resultados y conserva preferencias e historial de palabras', () => {
  const state = returnHome({ ...playing(), screen: 'final', usedWords: ['a'], cardCount: 40, language: 'fr' });
  assert.equal(state.screen, 'home');
  assert.deepEqual(state.deck, []);
  assert.equal(state.turnEndsAt, null);
  assert.equal(state.cardCount, 40);
  assert.deepEqual(state.usedWords, ['a']);
  assert.equal(state.language, 'fr');
});

test('La preparación del juego conserva el idioma seleccionado desde la home', () => {
  const source = { ...initialState, screen: 'home', cardCount: 30, language: 'fr', usedWords: ['a'], teams: [
    { name: 'Equipo A', score: 0, icon: '🌙' },
    { name: 'Equipo B', score: 0, icon: '⚡' },
  ] };
  const next = resetForSetup(source);
  assert.equal(next.screen, 'setup');
  assert.equal(next.language, 'fr');
  assert.equal(next.cardCount, 30);
  assert.equal(next.teams[0].name, 'Equipo A');
});

function playing(words = ['A', 'B', 'C']) {
  return { ...initialState, screen: 'play', deck: words.map(palabra => ({ palabra })),
    remaining: words, currentCard: words[0], turnEndsAt: 30_000 };
}
test('No se puntúa ni pasa con el reloj agotado', () => {
  for (const correct of [true, false]) {
    const state = answer(playing(), correct, 30_000);
    assert.equal(state.screen, 'review');
    assert.equal(state.teams[0].score, 0);
    assert.deepEqual(state.remaining, ['A', 'B', 'C']);
  }
});
test('Pasar resta cinco segundos y conserva la carta; dos pendientes no fuerzan relevo', () => {
  const state = answer(playing(['A', 'B']), false, 1_000);
  assert.equal(state.turnEndsAt, 25_000);
  assert.equal(state.screen, 'play');
  assert.deepEqual(state.remaining, ['B', 'A']);
  assert.equal(answer(state, false, 2_000).screen, 'review');
});
test('La última tarjeta se puede rectificar repetidamente antes de confirmar', () => {
  let state = answer(playing(['A']), true, 1_000);
  assert.equal(state.screen, 'review');
  state = correctReview(state, 'A');
  assert.equal(state.teams[0].score, 0);
  assert.deepEqual(state.remaining, ['A']);
  state = correctReview(state, 'A');
  assert.equal(state.screen, 'review');
  assert.equal(state.teams[0].score, 1);
  assert.equal(state.roundScores[0][0], 1);
  state = confirmReview(state);
  assert.equal(state.screen, 'roundBreak');
  assert.equal(state.currentTeam, 1);
});
test('El relevo oculta tarjeta y no inicia reloj', () => {
  const state = confirmReview(finishTurn(playing()));
  assert.equal(state.screen, 'ready');
  assert.equal(state.turnEndsAt, null);
  assert.equal(state.currentTeam, 1);
});
test('Partida completa: mismo mazo y suma exacta de tres rondas', () => {
  let state = playing();
  for (let round = 0; round < 3; round++) {
    state = resetRound(state, round, state.currentTeam);
    const deadline = state.turnEndsAt;
    for (let card = 0; card < 3; card++) state = answer(state, true, deadline - 1);
    state = confirmReview(state);
  }
  assert.equal(state.screen, 'final');
  assert.equal(state.teams.reduce((sum, team) => sum + team.score, 0), 9);
  assert.equal(state.roundScores.flat().reduce((a, b) => a + b), 9);
});test('El mazo no queda vacío cuando el juego pide un idioma internacional sin tarjetas marcadas como internacionales', () => {
  const deck = buildDeck(20, [], 'en');
  assert.equal(deck.length, 20);
  assert.ok(deck.every(card => card.palabra));
});
test('Mazos distintos de 20, 30 y 40, equilibrados en dificultad', () => {
  for (const size of [20, 30, 40]) {
    const deck = buildDeck(size, []);
    assert.equal(deck.length, size);
    assert.equal(new Set(deck.map(card => normalizedWord(card.palabra))).size, size);
    const next = buildDeck(size, deck.map(card => normalizedWord(card.palabra)));
    assert.ok(next.every(card => !deck.some(previous => normalizedWord(previous.palabra) === normalizedWord(card.palabra))));
    const counts = Object.values(Object.groupBy(deck, card => card.dificultad)).map(group => group.length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  }
});
