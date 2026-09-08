const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '../..');
const localInputPath = path.join(projectRoot, 'data', 'wordBank.csv');
const legacyLocalInputPath = path.join(projectRoot, 'data', 'base_palabras_juego_definitiva_3834_1788880342042.csv');
const legacyInputPath = path.join(workspaceRoot, 'attached_assets', 'base_palabras_juego_definitiva_3834_1788880342042.csv');
const inputPath = process.env.WORD_BANK_CSV
  ? path.resolve(process.env.WORD_BANK_CSV)
  : fs.existsSync(localInputPath)
    ? localInputPath
    : fs.existsSync(legacyLocalInputPath)
      ? legacyLocalInputPath
      : legacyInputPath;
const translationInputPath = process.env.WORD_BANK_TRANSLATIONS_CSV
  ? path.resolve(process.env.WORD_BANK_TRANSLATIONS_CSV)
  : path.join(projectRoot, 'data', 'wordBank_translations.csv');
const categorySubcategoryInputPath = process.env.CATEGORY_SUBCATEGORY_TRANSLATIONS_CSV
  ? path.resolve(process.env.CATEGORY_SUBCATEGORY_TRANSLATIONS_CSV)
  : path.join(projectRoot, 'data', 'category_subcategory_translations.csv');
const outputPath = path.join(projectRoot, 'data', 'wordBank.ts');

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

if (!fs.existsSync(inputPath)) {
  throw new Error(`No se encuentra el CSV definitivo: ${inputPath}`);
}

const rows = parseCsv(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
const headers = rows.shift();
const indexes = Object.fromEntries(headers.map((header, index) => [header.trim(), index]));
const requiredHeaders = ['palabra', 'categoria', 'subcategoria', 'dificultad', 'tipo'];
for (const header of requiredHeaders) {
  if (indexes[header] === undefined) {
    throw new Error(`El CSV no contiene la columna requerida "${header}"`);
  }
}

const translations = new Map();
if (fs.existsSync(translationInputPath)) {
  const translationRows = parseCsv(fs.readFileSync(translationInputPath, 'utf8').replace(/^\uFEFF/, ''));
  const translationHeaders = translationRows.shift();
  const translationIndex = Object.fromEntries(translationHeaders.map((header, index) => [header.trim(), index]));
  const translationKeys = translationRows.filter((row) => row.length >= 3);
  for (const row of translationKeys) {
    const id = String(row[translationIndex.palabra_id] ?? '').trim();
    const language = String(row[translationIndex.idioma] ?? '').trim();
    const local = String(row[translationIndex.nombre_localizado] ?? '').trim();
    if (!id || !language || !local) continue;
    const target = translations.get(id) ?? {};
    target[language] = local;
    translations.set(id, target);
  }
}

const categoryTranslations = new Map();
const subcategoryTranslations = new Map();
if (fs.existsSync(categorySubcategoryInputPath)) {
  const catRows = parseCsv(fs.readFileSync(categorySubcategoryInputPath, 'utf8').replace(/^\uFEFF/, ''));
  const catHeaders = catRows.shift();
  const catIndex = Object.fromEntries(catHeaders.map((header, index) => [header.trim(), index]));
  for (const row of catRows) {
    const type = String(row[catIndex.tipo] ?? '').trim().toLowerCase();
    const value = String(row[catIndex.valor] ?? '').trim();
    const language = String(row[catIndex.idioma] ?? '').trim();
    const local = String(row[catIndex.texto] ?? '').trim();
    if (!type || !value || !language || !local) continue;
    if (type === 'categoria') {
      const target = categoryTranslations.get(value) ?? {};
      target[language] = local;
      categoryTranslations.set(value, target);
    } else if (type === 'subcategoria') {
      const target = subcategoryTranslations.get(value) ?? {};
      target[language] = local;
      subcategoryTranslations.set(value, target);
    }
  }
}

const cards = rows
  .map((row) => {
    const palabra = row[indexes.palabra]?.trim() ?? '';
    const category = row[indexes.categoria]?.trim() ?? 'Cultura';
    const subcategory = row[indexes.subcategoria]?.trim() ?? '';
    const difficulty = row[indexes.dificultad]?.trim() ?? 'Media';
    const tipo = row[indexes.tipo]?.trim() ?? '';
    const alcance = row[indexes.alcance]?.trim().toLowerCase() ?? '';
    const internacionalByAlcance = alcance === 'internacional' || alcance === 'international' || alcance === 'global';
    const internacionalFlagValue = indexes.internacional
      ? (row[indexes.internacional]?.trim().toLowerCase() === 'sí' || row[indexes.internacional]?.trim().toLowerCase() === 'si' || row[indexes.internacional]?.trim().toLowerCase() === 'yes' || row[indexes.internacional]?.trim().toLowerCase() === 'true')
      : internacionalByAlcance;
    const id = String(row[indexes.id] ?? '').trim();
    const base = {
      palabra,
      categoria: category,
      subcategoria: subcategory,
      dificultad: difficulty,
      tipo,
      internacional: internacionalFlagValue ? true : undefined,
      ...(id ? { id } : {}),
    };
    const cardTranslations = translations.get(id);
    if (cardTranslations && Object.keys(cardTranslations).length > 0) {
      base.translations = cardTranslations;
    }
    const categoryMap = categoryTranslations.get(category);
    if (categoryMap && Object.keys(categoryMap).length > 0) {
      base.categoryTranslations = categoryMap;
    }
    const subcategoryMap = subcategoryTranslations.get(subcategory);
    if (subcategoryMap && Object.keys(subcategoryMap).length > 0) {
      base.subcategoryTranslations = subcategoryMap;
    }
    return base;
  })
  .filter((card) => card.palabra);

const difficulties = [...new Set(cards.map((card) => card.dificultad))];
const difficultyType = difficulties.map((difficulty) => JSON.stringify(difficulty)).join(' | ');
// Each entry is checked separately, avoiding an enormous inferred union.
const body = cards.map((card) => `  ((card: WordCard): WordCard => card)(${JSON.stringify(card)})`).join(',\n');
const output = `// Generado desde la base cultural definitiva. No editar a mano.\n// Regenerar con: pnpm run generate-word-bank\nexport type Difficulty = ${difficultyType};\n\nexport type WordCard = {\n  id?: string;\n  palabra: string;\n  categoria: string;\n  subcategoria: string;\n  dificultad: Difficulty;\n  tipo: string;\n  internacional?: boolean;\n  translations?: Partial<Record<string, string>>;\n  categoryTranslations?: Partial<Record<string, string>>;\n  subcategoryTranslations?: Partial<Record<string, string>>;\n};\n\nexport const WORD_BANK: WordCard[] = [\n${body}\n];\n`;

fs.writeFileSync(outputPath, output);
console.log(`Banco generado: ${cards.length} tarjetas desde ${path.basename(inputPath)}${fs.existsSync(translationInputPath) ? ` y ${path.basename(translationInputPath)}` : ''}`);
