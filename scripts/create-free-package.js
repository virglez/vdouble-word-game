const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'data', 'wordBank.csv');
const packagePath = path.join(root, 'data', 'wordBank.free.csv');
const translationsPath = path.join(root, 'data', 'wordBank_translations.csv');
const categorySubcategoryPath = path.join(root, 'data', 'category_subcategory_translations.csv');
const familyPackagePath = path.join(root, 'data', 'wordBank_family.csv');
const targetSize = 400;

// Subcategorías que suelen ser nombres propios de persona/marca: normalmente
// no cambian de un idioma a otro, así que la falta de traducción es baja prioridad.
const lowPriorityCategories = new Set(['Deportes', 'Música', 'Marcas', 'Ciencia']);
const lowPrioritySubcategories = new Set([
  'Actor', 'Actriz', 'Director', 'Futbolista', 'Tenista', 'Cantante', 'Grupo',
  'Escritor', 'Escritora', 'Personaje histórico', 'Explorador', 'Faraón',
  'Pintor', 'Pintora', 'Escultor', 'Arquitecto',
]);

function translationPriority(row) {
  if (lowPriorityCategories.has(row.categoria)) return 'baja';
  if (lowPrioritySubcategories.has(row.subcategoria)) return 'baja';
  if (['Cine y TV', 'Lugares', 'Literatura', 'Ocio'].includes(row.categoria)) return 'alta';
  if (row.categoria === 'Historia') return 'media';
  return 'media';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell); if (row.some(value => value.trim())) rows.push(row); }
  return rows;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const source = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(source);
const headers = rows.shift();
const index = Object.fromEntries(headers.map((header, position) => [header, position]));
const candidates = rows
  .map(row => Object.fromEntries(headers.map((header, position) => [header, row[position] ?? ''])))
  .filter(row => row.popularidad === 'Muy alta');
const byCategory = new Map();
for (const row of candidates) (byCategory.get(row.categoria) ?? byCategory.set(row.categoria, []).get(row.categoria)).push(row);

const selected = [];
const categories = [...byCategory.keys()].sort();
for (const category of categories) selected.push(...byCategory.get(category).slice(0, 25));
while (selected.length < targetSize) {
  const availableCategories = categories.filter(category =>
    byCategory.get(category).some(row => !selected.includes(row)),
  );
  const category = availableCategories.sort((left, right) =>
    selected.filter(row => row.categoria === left).length - selected.filter(row => row.categoria === right).length,
  )[0];
  if (!category) break;
  const next = byCategory.get(category).find(row => !selected.includes(row));
  selected.push(next);
}
if (selected.length < targetSize) throw new Error(`Solo hay ${selected.length} candidatas para el paquete`);

const outputHeaders = headers.filter(header => !['alcance', 'infantil'].includes(header));
const output = [
  outputHeaders.map(csvCell).join(','),
  ...selected.map(row => outputHeaders.map(header => csvCell(row[header])).join(',')),
].join('\n') + '\n';
fs.writeFileSync(packagePath, output, 'utf8');

const familyRows = fs.existsSync(familyPackagePath)
  ? parseCsv(fs.readFileSync(familyPackagePath, 'utf8').replace(/^\uFEFF/, '')).slice(1)
    .map(row => Object.fromEntries(headers.map((header, position) => [header, row[position] ?? ''])))
  : [];

if (fs.existsSync(categorySubcategoryPath)) {
  const translationRows = parseCsv(fs.readFileSync(categorySubcategoryPath, 'utf8').replace(/^\uFEFF/, ''));
  const translationHeaders = translationRows.shift();
  const usedCategories = new Set(selected.map(row => row.categoria));
  const usedSubcategories = new Set(selected.map(row => row.subcategoria));
  for (const row of familyRows) {
    usedCategories.add(row.categoria);
    usedSubcategories.add(row.subcategoria);
  }
  const keptTranslationRows = translationRows.filter(row => (row[0] === 'categoria' ? usedCategories : usedSubcategories).has(row[1]));
  fs.writeFileSync(categorySubcategoryPath, [
    translationHeaders.map(csvCell).join(','),
    ...keptTranslationRows.map(row => translationHeaders.map((_, position) => csvCell(row[position])).join(',')),
  ].join('\n') + '\n', 'utf8');
}

// Cobertura de traducciones (en/fr/pt) de las palabras marcadas como internacionales.
const translationLangs = new Map();
if (fs.existsSync(translationsPath)) {
  const translationRows = parseCsv(fs.readFileSync(translationsPath, 'utf8').replace(/^\uFEFF/, ''));
  const translationHeaders = translationRows.shift();
  const translationIndex = Object.fromEntries(translationHeaders.map((header, position) => [header, position]));
  for (const row of translationRows) {
    const id = row[translationIndex.palabra_id]?.trim();
    const lang = row[translationIndex.idioma]?.trim();
    if (!id || !lang) continue;
    (translationLangs.get(id) ?? translationLangs.set(id, new Set()).get(id)).add(lang);
  }
}
const internationalRows = selected.filter(row => row.internacional === 'true');
const missingTranslationRows = internationalRows
  .filter(row => !(translationLangs.get(row.id)?.size))
  .map(row => ({ ...row, prioridad: translationPriority(row) }))
  .sort((left, right) => {
    const order = { alta: 0, media: 1, baja: 2 };
    return order[left.prioridad] - order[right.prioridad] || left.categoria.localeCompare(right.categoria) || left.palabra.localeCompare(right.palabra);
  });

const count = (field, value) => selected.filter(row => row[field] === value).length;
console.log(JSON.stringify({
  total: selected.length,
  familyPackage: familyRows.length,
  internacional: count('internacional', 'true'),
  categories: Object.fromEntries(categories.map(category => [category, selected.filter(row => row.categoria === category).length])),
  translations: {
    internationalTotal: internationalRows.length,
    missing: missingTranslationRows.length,
    missingByPriority: {
      alta: missingTranslationRows.filter(row => row.prioridad === 'alta').length,
      media: missingTranslationRows.filter(row => row.prioridad === 'media').length,
      baja: missingTranslationRows.filter(row => row.prioridad === 'baja').length,
    },
  },
}, null, 2));