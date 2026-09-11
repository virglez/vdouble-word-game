const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'data', 'wordBank.csv');
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function parseCsv(t) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1];
    if (c === '"' && q && n === '"') { cell += '"'; i++; }
    else if (c === '"') q = !q;
    else if (c === ',' && !q) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !q) { if (c === '\r' && n === '\n') i++; row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some(v => v.trim())) rows.push(row); }
  return rows;
}
const rows = parseCsv(text);
const headers = rows.shift();
const R = rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
const out = [];
const log = (...a) => out.push(a.join(' '));
const count = (arr) => { const m = new Map(); for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const fmt = (r) => `${r.id} | ${r.palabra} | ${r.categoria} | ${r.subcategoria} | ${r.tipo} | ${r.epoca}`;

log('ROWS', R.length);
for (const f of ['categoria', 'popularidad', 'dificultad', 'epoca', 'alcance', 'tipo', 'infantil']) {
  log(`\n## ${f}`); for (const [v, c] of count(R.map(r => r[f]))) log(`  ${c}\t${v}`);
}
log('\n## subcategoria per categoria');
for (const [cat] of count(R.map(r => r.categoria))) {
  log(`  [${cat}]`);
  for (const [v, c] of count(R.filter(r => r.categoria === cat).map(r => r.subcategoria))) log(`     ${c}\t${v}`);
}
log('\n## malformed');
rows.forEach((r, i) => { if (r.length !== headers.length) log('  cols', r.length, r.join(',')); });
for (const r of R) for (const h of headers) {
  const v = r[h];
  if (!v.trim()) log('  empty', h, fmt(r));
  else if (v !== v.trim() || /\s{2,}/.test(v)) log('  spacing', h, JSON.stringify(v), fmt(r));
}
log('\n## suspicious chars');
for (const r of R) if (/[^\p{L}\p{N}\s'’:.,!?¿¡&\-\/()]/u.test(r.palabra) || /^\d+$/.test(r.palabra)) log('  ', fmt(r));

const norm = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const stripArt = s => s.replace(/^(el|la|los|las|the|le|les|un|una|a|an) /, '');
const byNorm = new Map();
for (const r of R) { const k = stripArt(norm(r.palabra)); (byNorm.get(k) ?? byNorm.set(k, []).get(k)).push(r); }
log('\n## exact duplicates (normalized)');
for (const [k, list] of byNorm) if (list.length > 1) log('  ', list.map(fmt).join('  ||  '));
log('\n## one-word-diff pairs');
const keys = [...byNorm.keys()];
const keySet = new Set(keys);
for (const k of keys) {
  const w = k.split(' ');
  if (w.length < 2) continue;
  for (const cand of [w.slice(1).join(' '), w.slice(0, -1).join(' ')]) {
    if (cand.length >= 4 && keySet.has(cand)) log('  ', byNorm.get(cand).map(fmt).join(' || '), '  <->  ', byNorm.get(k).map(fmt).join(' || '));
  }
}
log('\n## levenshtein-1 pairs (len>=6)');
function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  if (keys[i].length >= 6 && lev1(keys[i], keys[j])) log('  ', byNorm.get(keys[i]).map(fmt).join(' || '), '  <->  ', byNorm.get(keys[j]).map(fmt).join(' || '));
}

const rule = (name, fn) => { log(`\n## RULE ${name}`); let n = 0; for (const r of R) if (fn(r)) { n++; log('  ', fmt(r)); } log('  count', n); };
rule('Películas tipo!=Película', r => r.categoria === 'Películas' && r.tipo !== 'Película');
rule('Series tipo!=Serie', r => r.categoria === 'Series' && r.tipo !== 'Serie');
rule('Lugares tipo!=Lugar', r => r.categoria === 'Lugares' && r.tipo !== 'Lugar');
rule('Marcas tipo!=Marca', r => r.categoria === 'Marcas' && r.tipo !== 'Marca');
rule('Personajes tipo!=Personaje', r => r.categoria === 'Personajes' && r.tipo !== 'Personaje');
rule('Cine y TV with Serie/Película tipo', r => r.categoria === 'Cine y TV' && ['Serie', 'Película'].includes(r.tipo));
rule('Música grupo/cantante mismatch', r => r.categoria === 'Música' && ((['Grupo', 'Grupo musical'].includes(r.subcategoria) && r.tipo !== 'Grupo') || (r.subcategoria === 'Cantante' && r.tipo !== 'Persona')));
rule('Música tipo Grupo but subcat not group', r => r.categoria === 'Música' && r.tipo === 'Grupo' && !['Grupo', 'Grupo musical'].includes(r.subcategoria));
rule('Deportes tipo Evento/Lugar (countries?)', r => r.categoria === 'Deportes' && ['Evento', 'Lugar'].includes(r.tipo));
rule('Deportes subcat Deporte/Deportista generic', r => r.categoria === 'Deportes' && ['Deporte', 'Deportista'].includes(r.subcategoria) && false);
rule('tipo Persona with article start', r => r.tipo === 'Persona' && /^(El|La|Los|Las) /.test(r.palabra));
rule('tipo Persona in Literatura/Cultura subcat Obra-like', r => r.tipo === 'Persona' && ['Obra', 'Literatura'].includes(r.subcategoria));
rule('Literatura/Personaje with tipo Obra', r => r.subcategoria === 'Personaje' && r.tipo === 'Obra');
rule('Historia tipo Lugar', r => r.categoria === 'Historia' && r.tipo === 'Lugar');
rule('Mitología tipo Personaje but place-like', r => r.categoria === 'Mitología' && /^(Olimpo|Valhalla|Atlantis|Atlántida|Asgard|Averno|Hades|Tártaro|Eldorado|El Dorado|Shangri)/.test(r.palabra));
rule('Historia/Arte/Literatura/Mitología/Cultura epoca Actual', r => ['Historia', 'Arte', 'Literatura', 'Mitología', 'Cultura'].includes(r.categoria) && r.epoca === 'Actual');
rule('tipo Obra/Personaje in Lugares/Marcas', r => ['Lugares', 'Marcas'].includes(r.categoria) && ['Obra', 'Personaje', 'Persona'].includes(r.tipo));
rule('Videojuegos tipo Personaje', r => r.categoria === 'Videojuegos' && r.tipo === 'Personaje');

const cross = (a, b) => { log(`\n## crosstab ${a} x ${b}`); const m = new Map(); for (const r of R) { const k = `${r[a]} | ${r[b]}`; m.set(k, (m.get(k) ?? 0) + 1); } for (const [k, c] of [...m.entries()].sort()) log(`  ${c}\t${k}`); };
cross('dificultad', 'popularidad'); cross('dificultad', 'infantil'); cross('categoria', 'dificultad'); cross('categoria', 'epoca'); cross('tipo', 'infantil');

fs.writeFileSync(process.argv[3] || path.join(require('os').tmpdir(), 'wordbank-report.txt'), out.join('\n'), 'utf8');
console.log('written', process.argv[3] || path.join(require('os').tmpdir(), 'wordbank-report.txt'), out.length, 'lines');
