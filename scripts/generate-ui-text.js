const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const csvPath = path.join(projectRoot, 'data', 'ui_text.csv');
const outputPath = path.join(projectRoot, 'data', 'ui_text.ts');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  return rows;
}

function normalizeLanguage(language) {
  const normalized = String(language ?? '').trim().toLowerCase();
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('pt')) return 'pt';
  return 'es';
}

function escape(value) {
  return JSON.stringify(String(value ?? ''));
}

if (!fs.existsSync(csvPath)) {
  throw new Error(`No se encuentra el CSV de textos: ${csvPath}`);
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''));
if (rows.length < 2) {
  throw new Error('El CSV de textos está vacío.');
}

const [headers, ...body] = rows;
const claveIndex = headers.findIndex((header) => header.trim() === 'clave');
const keyIndex = headers.findIndex((header) => header.trim() === 'key');
const langIndex = headers.findIndex((header) => header.trim() === 'idioma');
const textIndex = headers.findIndex((header) => header.trim() === 'texto');

const writeUiText = (languages, uiText) => {
  languages = ['es', 'en', 'fr', 'pt'];
  for (const language of languages) uiText[language] = { ...uiText.es, ...uiText[language] };
  const lines = [];
  lines.push('// Auto-generated from data/ui_text.csv. Do not edit by hand.');
  lines.push("export type LanguageCode = 'es' | 'en' | 'fr' | 'pt';");
  lines.push('');
  lines.push('export const LANGUAGE_OPTIONS = [');
  lines.push("  { code: 'es' as const, label: 'ES' },");
  lines.push("  { code: 'en' as const, label: 'EN' },");
  lines.push("  { code: 'fr' as const, label: 'FR' },");
  lines.push("  { code: 'pt' as const, label: 'PT' },");
  lines.push('] as const;');
  lines.push('');
  lines.push('export const defaultLanguage: LanguageCode = "es";');
  lines.push('');
  lines.push('export const UI_TEXT: Record<LanguageCode, Record<string, string>> = {');

  for (const lang of languages) {
    lines.push(`  ${JSON.stringify(lang)}: {`);
    const keys = Object.keys(uiText[lang] ?? {});
    for (const key of keys) {
      lines.push(`    ${JSON.stringify(key)}: ${escape(uiText[lang][key])},`);
    }
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');
  lines.push('export function getText(language: LanguageCode, key: string) {');
  lines.push('  return UI_TEXT[language]?.[key] ?? UI_TEXT.es[key] ?? key;');
  lines.push('}');

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
  console.log(`Generado ${outputPath} con ${body.length} claves de texto.`);
};

if (langIndex >= 0 && textIndex >= 0 && (claveIndex >= 0 || keyIndex >= 0)) {
  const uiText = {};
  for (const row of body) {
    const key = String(row[claveIndex >= 0 ? claveIndex : keyIndex] ?? '').trim();
    const language = String(row[langIndex] ?? '').trim();
    const text = String(row[textIndex] ?? '').trim();
    if (!key || !language || !text) continue;

    const normalizedLanguage = normalizeLanguage(language);
    if (!uiText[normalizedLanguage]) uiText[normalizedLanguage] = {};
    uiText[normalizedLanguage][key] = text;
  }

  writeUiText(['es', 'en', 'fr', 'pt'].filter((language) => uiText[language]), uiText);
  process.exit(0);
}

// Legacy layout fallback: key,es,en,fr
if (keyIndex >= 0) {
  const languageIndexes = headers
    .map((header, index) => [header.trim(), index])
    .filter(([name]) => name !== 'key' && name !== 'clave')
    .reduce((acc, [language, index]) => ({ ...acc, [language]: index }), {});

  const uiText = {};
  for (const lang of Object.keys(languageIndexes)) {
    uiText[normalizeLanguage(lang)] = {};
  }

  for (const row of body) {
    const key = String(row[keyIndex] ?? '').trim();
    if (!key) continue;
    for (const lang of Object.keys(languageIndexes)) {
      const normalized = normalizeLanguage(lang);
      uiText[normalized][key] = String(row[languageIndexes[lang]] ?? '').trim();
    }
  }

  writeUiText(['es', 'en', 'fr', 'pt'].filter((language) => uiText[language]), uiText);
  process.exit(0);
}

throw new Error('El CSV de textos debe tener una de las columnas soportadas: key/es/en/fr o clave/idioma/texto.');
