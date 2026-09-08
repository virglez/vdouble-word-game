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
const keyIndex = headers.findIndex((header) => header.trim() === 'key');
if (keyIndex < 0) {
  throw new Error('El CSV de textos debe tener la columna "key".');
}

const languageIndexes = headers
  .map((header, index) => [header.trim(), index])
  .filter(([name]) => name !== 'key')
  .reduce((acc, [language, index]) => ({ ...acc, [language]: index }), {});

const languages = Object.keys(languageIndexes);
const uiText = languages.reduce((acc, lang) => {
  acc[lang] = {};
  return acc;
}, {});

for (const row of body) {
  const key = (row[keyIndex] ?? '').trim();
  if (!key) continue;
  for (const lang of languages) {
    const index = languageIndexes[lang];
    if (index === undefined) continue;
    uiText[lang][key] = (row[index] ?? '').trim();
  }
}

const lines = [];
lines.push('// Auto-generated from data/ui_text.csv. Do not edit by hand.');
lines.push("export type LanguageCode = 'es' | 'en' | 'fr';");
lines.push('');
lines.push('export const LANGUAGE_OPTIONS = [');
lines.push("  { code: 'es' as const, label: 'ES' },");
lines.push("  { code: 'en' as const, label: 'EN' },");
lines.push("  { code: 'fr' as const, label: 'FR' },");
lines.push('] as const;');
lines.push('');
lines.push('export const defaultLanguage: LanguageCode = \"es\";');
lines.push('');
lines.push('export const UI_TEXT: Record<LanguageCode, Record<string, string>> = {');
for (const lang of languages) {
  lines.push(`  ${JSON.stringify(lang)}: {`);
  const keys = Object.keys(uiText[lang]);
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
