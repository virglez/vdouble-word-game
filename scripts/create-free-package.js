const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'data', 'wordBank.csv');
const backupPath = path.join(root, 'data', 'wordBank.original.csv');
const packagePath = path.join(root, 'data', 'wordBank.free.csv');
const targetSize = 400;

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

if (!fs.existsSync(backupPath)) fs.copyFileSync(sourcePath, backupPath);
const output = [
  headers.filter(header => header !== 'alcance').map(csvCell).join(','),
  ...selected.map(row => headers.filter(header => header !== 'alcance').map(header => csvCell(row[header])).join(',')),
].join('\n') + '\n';
fs.writeFileSync(packagePath, output, 'utf8');

const count = (field, value) => selected.filter(row => row[field] === value).length;
console.log(JSON.stringify({ total: selected.length, infantil: count('infantil', 'true'), internacional: count('internacional', 'true'), categories: Object.fromEntries(categories.map(category => [category, selected.filter(row => row.categoria === category).length])) }, null, 2));