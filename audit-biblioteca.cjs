/**
 * Auditoria do SQL da biblioteca.
 *
 * Regras:
 *  - chaves JSON devem ser ASCII (o codigo dos jogos le "situacoes", nao "situações");
 *  - textos visíveis devem estar em portugues acentuado;
 *  - nenhum lixo de outro idioma.
 *
 *   node audit-biblioteca.cjs
 */
const fs = require('fs');
const arquivos = ['db/library.seed.sql', 'db/library.fase3.sql', 'db/library.complemento.sql'];

const TERMOS = [
  ['crianca', 'criança'], ['voce', 'você'], ['situacao', 'situação'], ['situacoes', 'situações'],
  ['expressoes', 'expressões'], ['correcao', 'correção'], ['atencao', 'atenção'],
  ['dividao', 'divisão'], ['observacao', 'observação'], ['produzao', 'produção'],
];
const ESTRANHOS = ['rhyme', 'perfection', '手套', '的手指', '手袋', 'substantiva'];

let problemas = 0;

for (const f of arquivos) {
  const s = fs.readFileSync(f, 'utf8');
  const erros = [];

  // 1) chaves JSON nao-ASCII
  const chaves = [...s.matchAll(/"([^"\\]*[^\x00-\x7F][^"\\]*)"\s*:/g)].map((m) => m[1]);
  if (chaves.length) erros.push(`chaves JSON acentuadas: ${[...new Set(chaves)].join(', ')}`);

  // 2) termos sem acento em TEXTO (fora de linhas de codigo/JSON-chave)
  for (const [ruim, bom] of TERMOS) {
    const re = new RegExp('(?<![a-zA-ZÀ-ú"])' + ruim + '(?![a-zA-ZÀ-ú])', 'gi');
    for (const m of s.matchAll(re)) {
      const ctx = s.slice(Math.max(0, m.index - 25), m.index + 25).replace(/\n/g, ' ');
      // ignora se for chave JSON ou nome de coluna
      if (/"\s*:/.test(s.slice(m.index + ruim.length, m.index + ruim.length + 3))) continue;
      if (/^\s*[a-z_]*$/.test(ctx.split(m[0])[1]?.trim()?.slice(0, 12) ?? '')) continue;
      erros.push(`"${ruim}" → "${bom}" em: ...${ctx}...`);
    }
  }

  // 3) lixo
  if (/[一-鿿]/.test(s)) erros.push('caracteres CJK');
  for (const e of ESTRANHOS) if (s.includes(e)) erros.push(`termo estranho: ${e}`);

  // 4) JSON valido
  const re2 = /'(\[[^']*\]|\{[^']*\})'/g;
  let m, tot = 0, bad = 0;
  while ((m = re2.exec(s))) { tot++; try { JSON.parse(m[1]); } catch { bad++; } }
  if (bad) erros.push(`${bad} JSON inválido(s)`);

  console.log(`${erros.length ? '✖' : '✅'} ${f}  (${tot} blocos JSON)`);
  erros.forEach((e) => { console.log('    - ' + e); problemas++; });
}

console.log(problemas ? `\n❌ ${problemas} problema(s)` : '\n✅ BIBLIOTECA OK — pronta para importar');
process.exit(problemas ? 1 : 0);