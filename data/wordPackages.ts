export type WordPackageId = 'core' | 'deportes' | 'cultura' | 'series-y-cine';

export type WordPackage = {
  id: WordPackageId;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
};

export const DEFAULT_WORD_PACKAGE: WordPackageId = 'core';

export const WORD_PACKAGES: WordPackage[] = [
  {
    id: 'core',
    name: 'Clásico',
    description: 'Las palabras más conocidas para empezar a jugar.',
    priceCents: 0,
    available: true,
  },
  {
    id: 'deportes',
    name: 'Deportes',
    description: 'Más nombres y momentos del mundo del deporte.',
    priceCents: 199,
    available: false,
  },
  {
    id: 'cultura',
    name: 'Cultura',
    description: 'Arte, historia, literatura y ciencia.',
    priceCents: 199,
    available: false,
  },
  {
    id: 'series-y-cine',
    name: 'Series y cine',
    description: 'Más personajes, películas y series para describir.',
    priceCents: 199,
    available: false,
  },
];