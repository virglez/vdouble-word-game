import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { answer, buildDeck, confirmReview, correctReview, finishTurn, initialState, normalizedWord, resetRound, returnHome, roundNames, TURN_LENGTH_MS, type CardCount, type GameState, type LanguageCode } from '@/lib/game';
export { roundNames, TURN_LENGTH_MS, type CardCount, type LanguageCode } from '@/lib/game';

const STORAGE_KEY = '@vdouble/state-v2';

function useGameValue() {
  const [state, setState] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (!saved || !active) return;
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.deck) || !Array.isArray(parsed.teams) || parsed.teams.length !== 2 ||
          !Array.isArray(parsed.remaining) || !Array.isArray(parsed.review) ||
          !Array.isArray(parsed.roundScores) || parsed.roundScores.length !== 3 ||
          ![0, 1, 2].includes(parsed.roundIndex) || ![0, 1].includes(parsed.currentTeam)) return;
      setState(parsed.screen === 'play' ? finishTurn(parsed) : parsed);
    }).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (hydrated) writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))).catch(() => undefined);
  }, [state, hydrated]);
  useEffect(() => {
    if (state.screen !== 'play' || !state.turnEndsAt) return;
    const timeout = setTimeout(() => setState(current => finishTurn(current)), Math.max(0, state.turnEndsAt - Date.now()));
    const subscription = AppState.addEventListener('change', status => {
      if (status !== 'active') setState(current => finishTurn(current));
    });
    return () => { clearTimeout(timeout); subscription.remove(); };
  }, [state.screen, state.turnEndsAt]);
  const reset = (current: GameState): GameState => ({ ...initialState, screen: 'setup', cardCount: current.cardCount,
    usedWords: current.usedWords, teams: [{ name: current.teams[0].name, score: 0, icon: current.teams[0].icon }, { name: current.teams[1].name, score: 0, icon: current.teams[1].icon }] });
  return {
    state, hydrated,
    currentCard: state.deck.find(card => card.palabra === state.currentCard) ?? null,
    roundName: roundNames[state.roundIndex],
    hasSavedGame: state.deck.length > 0 && state.screen !== 'final',
    startSetup: () => setState(reset),
    goHome: () => setState(returnHome),
    newGame: () => setState(reset),
    continueGame: () => setState(current => current.screen === 'home' ? { ...current, screen: current.deck.length ? 'instructions' : 'setup' } : current),
    updateTeamName: (team: 0 | 1, name: string) => setState(current => {
      const teams: GameState['teams'] = [...current.teams];
      teams[team] = { ...teams[team], name };
      return { ...current, teams };
    }),
    updateTeamIcon: (team: 0 | 1, icon: string) => setState(current => {
      const teams: GameState['teams'] = [...current.teams];
      teams[team] = { ...teams[team], icon };
      return { ...current, teams };
    }),
    setLanguage: (language: LanguageCode) => setState(current => ({ ...current, language })),
    setCardCount: (cardCount: CardCount) => setState(current => ({ ...current, cardCount })),
    createGame: () => setState(current => {
      const deck = buildDeck(current.cardCount, current.usedWords, current.language);
      const teams: GameState['teams'] = [
        { name: current.teams[0].name.trim() || 'Equipo 1', score: 0, icon: current.teams[0].icon || '🌙' },
        { name: current.teams[1].name.trim() || 'Equipo 2', score: 0, icon: current.teams[1].icon || '⚡' },
      ];
      return { ...resetRound({ ...reset(current), deck, teams,
        usedWords: Array.from(new Set([...current.usedWords, ...deck.map(card => normalizedWord(card.palabra))])) }, 0, 0),
        screen: 'instructions', turnEndsAt: null };
    }),
    startRound: () => setState(current => {
      if (current.screen !== 'instructions' && current.screen !== 'roundBreak') return current;
      const next = resetRound(current, current.roundIndex + (current.screen === 'roundBreak' ? 1 : 0), current.currentTeam);
      return current.screen === 'roundBreak' ? { ...next, screen: 'instructions', turnEndsAt: null } : next;
    }),
    continueTurn: () => setState(current => current.screen === 'ready' ? { ...current, screen: 'play', timeUp: false, turnEndsAt: Date.now() + TURN_LENGTH_MS } : current),
    markCorrect: () => setState(current => answer(current, true)),
    passCard: () => setState(current => answer(current, false)),
    correctReview: (word: string) => setState(current => correctReview(current, word)),
    confirmReview: () => setState(confirmReview),
  };
}

const GameContext = createContext<ReturnType<typeof useGameValue> | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  const value = useGameValue();
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame debe utilizarse dentro de GameProvider');
  return context;
}
