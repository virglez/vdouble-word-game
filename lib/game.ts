import { WORD_BANK, type Difficulty, type WordCard } from '../data/wordBank.ts';
import { WORD_BANK_FAMILY } from '../data/wordBankFamily.ts';
import { DEFAULT_WORD_PACKAGE } from '../data/wordPackages.ts';

export type LanguageCode = 'es' | 'en' | 'fr' | 'pt';

export function localizedWord(card: Pick<WordCard, 'palabra' | 'translations'> | null | undefined, language: LanguageCode): string {
  if (!card) return '';
  return card.translations?.[language] ?? card.palabra;
}

const defaultTeamNames: Record<LanguageCode, [string, string]> = {
  es: ['Equipo Sol', 'Equipo Luna'],
  en: ['Team Sun', 'Team Moon'],
  fr: ['Équipe Soleil', 'Équipe Lune'],
  pt: ['Equipa Sol', 'Equipa Lua'],
};

export function changeLanguage(state: GameState, language: LanguageCode): GameState {
  const teams = state.teams.map((team, index) => ({
    ...team,
    name: !team.customName && Object.values(defaultTeamNames).some(names => names[index] === team.name)
      ? defaultTeamNames[language][index] : team.name,
  })) as GameState['teams'];
  return { ...state, language, teams };
}

export function finishTurn(state: GameState): GameState {
  return state.screen === 'play' ? { ...state, screen: 'review', timeUp: true, turnEndsAt: null } : state;
}

export function resetForSetup(state: GameState): GameState {
  return {
    ...initialState,
    screen: 'setup',
    cardCount: state.cardCount,
    usedWords: state.usedWords,
    language: state.language,
    familyMode: false,
    teams: [
      { customName: state.teams[0].customName, customIcon: state.teams[0].customIcon, name: state.teams[0].name, score: 0, icon: state.teams[0].customIcon ? state.teams[0].icon : '☀️' },
      { customName: state.teams[1].customName, customIcon: state.teams[1].customIcon, name: state.teams[1].name, score: 0, icon: state.teams[1].customIcon ? state.teams[1].icon : '🌙' },
    ],
  };
}

export function returnHome(state: GameState): GameState {
  return {
    ...initialState,
    screen: 'home',
    cardCount: state.cardCount,
    usedWords: state.usedWords,
    language: state.language,
    familyMode: state.familyMode,
    teams: [
      { customName: state.teams[0].customName, customIcon: state.teams[0].customIcon, name: state.teams[0].name, score: 0, icon: state.teams[0].icon },
      { customName: state.teams[1].customName, customIcon: state.teams[1].customIcon, name: state.teams[1].name, score: 0, icon: state.teams[1].icon },
    ],
  };
}

export function answer(state: GameState, correct: boolean, now = Date.now()): GameState {
  if (state.screen !== 'play' || !state.currentCard || !state.turnEndsAt || state.timeUp) return state;
  if (now >= state.turnEndsAt) return finishTurn(state);
  const word = state.currentCard;
  const review = [...state.review.filter(item => item.word !== word), { word, correct }];
  const remaining = correct ? state.remaining.filter(item => item !== word) : moveCardToEnd(state.remaining, word);
  const teams: GameState['teams'] = [{ ...state.teams[0] }, { ...state.teams[1] }];
  const roundScores: GameState['roundScores'] = state.roundScores.map(row => [...row]);
  if (correct) {
    teams[state.currentTeam].score += 1;
    roundScores[state.roundIndex][state.currentTeam] += 1;
  }
  const turnEndsAt = state.turnEndsAt - (correct ? 0 : 3_000);
  const next = { ...state, teams, roundScores, review, remaining, currentCard: remaining[0] ?? null, turnEndsAt };
  const allPassed = remaining.every(item => review.some(entry => entry.word === item && !entry.correct));
  return !remaining.length || turnEndsAt <= now || allPassed ? finishTurn(next) : next;
}

export function correctReview(state: GameState, word: string): GameState {
  const entry = state.review.find(item => item.word === word);
  if (state.screen !== 'review' || !entry) return state;
  const correct = !entry.correct;
  const delta = correct ? 1 : -1;
  const teams: GameState['teams'] = [{ ...state.teams[0] }, { ...state.teams[1] }];
  teams[state.currentTeam].score += delta;
  const roundScores: GameState['roundScores'] = state.roundScores.map(row => [...row]);
  roundScores[state.roundIndex][state.currentTeam] += delta;
  const remaining = correct ? state.remaining.filter(item => item !== word) : [...state.remaining.filter(item => item !== word), word];
  return { ...state, teams, roundScores, remaining, currentCard: remaining[0] ?? null,
    review: state.review.map(item => item.word === word ? { word, correct } : item) };
}

export function confirmReview(state: GameState): GameState {
  if (state.screen !== 'review') return state;
  return { ...state, review: [], timeUp: false, turnEndsAt: null,
    screen: state.remaining.length ? 'ready' : state.roundIndex === 2 ? 'final' : 'roundBreak',
    currentTeam: state.currentTeam === 0 ? 1 : 0 };
}

export const TURN_LENGTH_MS = 30_000;

export type Screen =
  | 'review'
  | 'ready'
  | 'home'
  | 'setup'
  | 'instructions'
  | 'play'
  | 'roundBreak'
  | 'final';

export type Team = {
  customName?: boolean;
  customIcon?: boolean;
  name: string;
  score: number;
  icon: string;
};

export type CardCount = 20 | 30 | 40;

export type GameState = {
  screen: Screen;
  cardCount: CardCount;
  teams: [Team, Team];
  deck: WordCard[];
  remaining: string[];
  currentCard: string | null;
  currentTeam: 0 | 1;
  roundIndex: number;
  turnEndsAt: number | null;
  timeUp: boolean;
  usedWords: string[];
  review: { word: string; correct: boolean }[];
  roundScores: [number, number][];
  language: LanguageCode;
  familyMode: boolean;
};

export const initialState: GameState = {
  screen: 'home',
  cardCount: 30,
  teams: [
    { name: 'Equipo Sol', score: 0, icon: '☀️' },
    { name: 'Equipo Luna', score: 0, icon: '🌙' },
  ],
  deck: [],
  remaining: [],
  currentCard: null,
  currentTeam: 0,
  roundIndex: 0,
  turnEndsAt: null,
  timeUp: false,
  usedWords: [],
  review: [],
  roundScores: [[0, 0], [0, 0], [0, 0]],
  language: 'es',
  familyMode: false,
};

export const roundNames = ['Descripción', 'Una palabra', 'Mímica'] as const;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizedWord(word: string) {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}

function moveCardToEnd(queue: string[], card: string): string[] {
  return [...queue.filter((word) => word !== card), card];
}

export function buildDeck(cardCount: CardCount, excludedWords: string[], language: LanguageCode = 'es', familyMode = false): WordCard[] {
  const unique = new Map<string, WordCard>();
  const baseBank = familyMode ? WORD_BANK_FAMILY : WORD_BANK;
  for (const card of baseBank) {
    unique.set(normalizedWord(card.palabra), card);
  }
  const allCandidates = Array.from(unique.values());
  const excluded = new Set(excludedWords);
  const packageCandidates = familyMode || DEFAULT_WORD_PACKAGE === 'core'
    ? allCandidates.filter((card) => card.popularidad === 'Muy alta')
    : allCandidates;
  const available = (packageCandidates.length >= cardCount ? packageCandidates : allCandidates)
    .filter((card) => !excluded.has(normalizedWord(card.palabra)));

  const internationalOnly = language !== 'es';
  const internationalCandidates = available.filter((card) => card.internacional === true);
  const filteredCandidates = internationalOnly
    ? (internationalCandidates.length >= cardCount ? internationalCandidates : available)
    : available;
  const source = (filteredCandidates.length >= cardCount ? filteredCandidates : available)
    .filter((card) => !internationalOnly || card.internacional === true || card.internacional === undefined);

  // Mientras queden suficientes tarjetas, una nueva partida no reutiliza
  // ninguna palabra de las partidas anteriores guardadas en el teléfono.
  const byDifficulty = new Map<Difficulty, WordCard[]>();
  for (const card of shuffle(source)) {
    const difficultyCards = byDifficulty.get(card.dificultad) ?? [];
    difficultyCards.push(card);
    byDifficulty.set(card.dificultad, difficultyCards);
  }

  const difficultyOrder = shuffle([
    'Fácil', 'Media', 'Difícil', 'Muy difícil',
    'Fácil', 'Media', 'Difícil', 'Media', 'Fácil', 'Difícil',
  ] as Difficulty[]);
  const categoryCounts = new Map<string, number>();
  const selected: WordCard[] = [];
  const selectedCards = new Set<WordCard>();

  // Reduce la presencia de términos muy difíciles y mantiene variedad de categorías.
  while (selected.length < cardCount) {
    const preferredDifficulty = difficultyOrder[selected.length % difficultyOrder.length];
    const difficultyPool = (byDifficulty.get(preferredDifficulty) ?? []).filter(
      (card) => !selectedCards.has(card),
    );
    const pool = difficultyPool.length > 0 ? difficultyPool : source.filter(card => !selectedCards.has(card));
    if (pool.length === 0) break;

    const lowestCategoryCount = Math.min(
      ...pool.map((card) => categoryCounts.get(card.categoria || 'Cultura') ?? 0),
    );
    const categoryCandidates = pool.filter(
      (card) => (categoryCounts.get(card.categoria || 'Cultura') ?? 0) === lowestCategoryCount,
    );
    const chosen = shuffle(categoryCandidates)[0] ?? pool[0];
    selected.push(chosen);
    selectedCards.add(chosen);
    const category = chosen.categoria || 'Cultura';
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  return selected;
}

export function resetRound(state: GameState, roundIndex: number, currentTeam: 0 | 1): GameState {
  const remaining = shuffle(state.deck.map((card) => card.palabra));
  return {
    ...state,
    screen: 'play',
    review: [],
    roundIndex,
    remaining,
    currentCard: remaining[0] ?? null,
    currentTeam,
    turnEndsAt: Date.now() + TURN_LENGTH_MS,
    timeUp: false,
  };
}

