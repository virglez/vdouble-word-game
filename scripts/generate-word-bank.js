const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '../..');
const localInputPath = path.join(projectRoot, 'data', 'base_palabras_juego_definitiva_3834_1788880342042.csv');
const legacyInputPath = path.join(workspaceRoot, 'attached_assets', 'base_palabras_juego_definitiva_3834_1788880342042.csv');
const inputPath = process.env.WORD_BANK_CSV
  ? path.resolve(process.env.WORD_BANK_CSV)
  : fs.existsSync(localInputPath)
    ? localInputPath
    : legacyInputPath;
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

const cards = rows
  .map((row) => ({
    palabra: row[indexes.palabra]?.trim() ?? '',
    categoria: row[indexes.categoria]?.trim() ?? 'Cultura',
    subcategoria: row[indexes.subcategoria]?.trim() ?? '',
    dificultad: row[indexes.dificultad]?.trim() ?? 'Media',
    tipo: row[indexes.tipo]?.trim() ?? '',
    internacional: indexes.internacional ? (row[indexes.internacional]?.trim().toLowerCase() === 'sí' || row[indexes.internacional]?.trim().toLowerCase() === 'si' || row[indexes.internacional]?.trim().toLowerCase() === 'yes' || row[indexes.internacional]?.trim().toLowerCase() === 'true' ? true : false) : undefined,
  }))
  .filter((card) => card.palabra);

const difficulties = [...new Set(cards.map((card) => card.dificultad))];
const difficultyType = difficulties.map((difficulty) => JSON.stringify(difficulty)).join(' | ');
const body = cards.map((card) => `  ${JSON.stringify(card)}`).join(',\n');
const output = `// Generado desde la base cultural definitiva. No editar a mano.\n// Regenerar con: pnpm --filter @workspace/juego-tres-rondas run generate-word-bank\nexport type Difficulty = ${difficultyType};\n\nexport type WordCard = {\n  palabra: string;\n  categoria: string;\n  subcategoria: string;\n  dificultad: Difficulty;\n  tipo: string;\n  internacional?: boolean;\n};\n\nexport const WORD_BANK: WordCard[] = [\n${body}\n];\n`;

fs.writeFileSync(outputPath, output);
console.log(`Banco generado: ${cards.length} tarjetas desde ${path.basename(inputPath)}`);