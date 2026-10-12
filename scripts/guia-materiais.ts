/**
 * Gera o guia de Materiais a partir do que existe DE FATO no banco:
 * para cada fonema, as palavras (imagem + áudio) e as sugestões de vídeo.
 *
 *   npm run db:guia            -> docs/GUIA-MATERIAIS-GERADO.md
 *   npm run db:guia -- X       -> só o fonema X
 */
import { writeFileSync } from 'node:fs';
import { q } from '../src/db.js';

const soFonema = (process.argv[2] ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type Palavra = { word: string; position: string };

const NOMES: Record<string, string> = {
  B: 'B', CH: 'Ch', D: 'D', F: 'F', G: 'G', J: 'J', K: 'K', L: 'L',
  LH: 'Lh', M: 'M', N: 'N', NH: 'Nh', P: 'P', QU: 'Qu', R: 'R',
  S: 'S', T: 'T', V: 'V', X: 'X', Z: 'Z',
};

const linhas: string[] = [];

/** Lê um campo JSON do banco sem quebrar se vier nulo ou texto simples. */
const ler = <T,>(v: any, padrao: T): T => {
  if (v === null || v === undefined || v === '') return padrao;
  if (typeof v !== 'string') return v as T;
  try { return JSON.parse(v) as T; } catch { return padrao; }
};
linhas.push('# Lista de materiais por fonema');
linhas.push('');
linhas.push('> Gerado automaticamente a partir do banco de dados.');
linhas.push('> Cada linha da tabela é **um material para enviar** na aba Materiais.');
linhas.push('');
linhas.push('**Três tipos por palavra:**');
linhas.push('');
linhas.push('| Tipo | Título do material | Arquivo | Para que serve |');
linhas.push('|---|---|---|---|');
linhas.push('| Imagem | `sol` | `s_sol.png` | **substitui o emoji** no jogo |');
linhas.push('| Áudio | `sol` | `s_sol.mp3` | você falando a palavra |');
linhas.push('| Áudio do som | `som-s` | `som-s.mp3` | som isolado, sem vogal (só para CH, LH, NH, QU) |');
linhas.push('| Vídeo | `modelo-s` | `modelo-s.mp4` | sua boca fazendo o som |');
linhas.push('');

const fonemas = await q<any>(
  `SELECT symbol, kind, words, sentences, syllables, combinations
   FROM phonemes ${soFonema ? 'WHERE symbol = ?' : ''}
   ORDER BY symbol`,
  soFonema ? [soFonema] : []
);

// sons que faz sentido gravar isolados, sem vogal
const ISOLADOS = new Set(['CH', 'LH', 'NH', 'QU']);
/** Palavra de exemplo para cada som isolado. */
const EXEMPLO: Record<string, string> = { CH: 'chave', LH: 'coelho', NH: 'minha', QU: 'quiabo' };
const ROTULO_POS: Record<string, string> = { inicial: 'início', medial: 'meio', final: 'final' };

for (const f of fonemas) {
  const palavras: Palavra[] = ler<Palavra[]>(f.words, []);
  const frases: string[] = ler<string[]>(f.sentences, []);

  linhas.push('---');
  linhas.push('');
  linhas.push(`## Fonema ${NOMES[f.symbol as string] ?? f.symbol} \`${f.symbol}\``);
  linhas.push('');

  if (f.kind === 'grupo_consonantal' || f.kind === 'cluster') {
    linhas.push(`⚠️ Este é o **grupo consonantal ${f.symbol}**. Foque nas partes: \`${(ler<string[]>(f.combinations, [])).join('`, `') || '—'}\`.`);
    linhas.push('');
  }

  linhas.push('### 1) Imagens e áudios (um material por palavra)');
  linhas.push('');
  linhas.push('| # | Título | Onde aparece | Arquivo de imagem | Arquivo de áudio |');
  linhas.push('|---|---|---|---|---|');
  palavras.forEach((p, i) => {
    const t = p.word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const slug = `${f.symbol.toLowerCase()}_${t}`;
    linhas.push(`| ${i + 1} | \`${p.word}\` | ${ROTULO_POS[p.position] ?? p.position ?? '—'} | \`${slug}.png\` | \`${slug}.mp3\` |`);
  });
  linhas.push('');
  linhas.push(`**Total deste fonema: ${palavras.length} palavras → ${palavras.length * 2} arquivos (imagem + áudio).**`);
  linhas.push('');

  if (ISOLADOS.has(f.symbol)) {
    linhas.push(`### 2) Áudio do som isolado (obrigatório para ${f.symbol})`);
    linhas.push('');
    linhas.push('| Título | Arquivo | Como gravar |');
    linhas.push('|---|---|---|');
    linhas.push(`| \`som-${f.symbol.toLowerCase()}\` | \`som-${f.symbol.toLowerCase()}.mp3\` | som **sem vogal**, sustaindo ~2 s: "${f.symbol.toLowerCase()}" |`);
    linhas.push('');
    linhas.push(`> Sem esse áudio a criança não consegue repetir o som isolado. Grave também uma **versão curta** (0,5 s) e uma **versão dentro de palavra** (ex.: "${EXEMPLO[f.symbol as string] ?? f.symbol}").`);
    linhas.push('');
  }

  linhas.push('### Vídeos sugeridos');
  linhas.push('');
  linhas.push('| Título | Arquivo | Duração | O que gravar |');
  linhas.push('|---|---|---|---|');
  linhas.push(`| \`modelo-${f.symbol.toLowerCase()}\` | \`modelo-${f.symbol.toLowerCase()}.mp4\` | 5 s | sua boca de frente fazendo o som, sem palavra |`);
  linhas.push(`| \`palavra-${f.symbol.toLowerCase()}\` | \`palavra-${f.symbol.toLowerCase()}.mp4\` | 10 s | você falando a 1ª palavra e a criança repetindo |`);
  const inicial = palavras.find((p) => p.position === 'inicial');
  const medial = palavras.find((p) => p.position === 'medial');
  const final = palavras.find((p) => p.position === 'final');
  const posicoes = [
    inicial && `**início** — "${inicial.word}"`,
    medial && `**meio** — "${medial.word}"`,
    final && `**final** — "${final.word}"`,
  ].filter(Boolean) as string[];
  linhas.push(`| \`posicoes-${f.symbol.toLowerCase()}\` | \`posicoes-${f.symbol.toLowerCase()}.mp4\` | 20 s | ${posicoes.join(' · ') || '—'} |`);
  linhas.push('');

  if (frases.length) {
    linhas.push('### Frases para praticar em casa');
    linhas.push('');
    for (const fr of frases) linhas.push(`- ${fr}`);
    linhas.push('');
    linhas.push('> Para frases, grave **um vídeo por frase** (a criança imita a frase inteira).');
    linhas.push('');
  }
}

// resumo final
const todos = await q<any>('SELECT symbol, words FROM phonemes');
let nPalavras = 0;
for (const f of todos) nPalavras += ler<Palavra[]>(f.words, []).length;

linhas.push('---');
linhas.push('');
linhas.push('## Resumo do tamanho do trabalho');
linhas.push('');
linhas.push('| Item | Quantidade |');
linhas.push('|---|---|');
linhas.push(`| Fonemas | ${todos.length} |`);
linhas.push(`| Palavras (imagens) | ${nPalavras} |`);
linhas.push(`| Áudios de palavra | ${nPalavras} |`);
linhas.push(`| Áudios de som isolado (CH, LH, NH, QU) | 4 |`);
linhas.push(`| Vídeos de modelo | ${todos.length * 3} |`);
linhas.push(`| **Total** | **${nPalavras * 2 + 4 + todos.length * 3}** |`);
linhas.push('');
linhas.push('> Dá para começar por **um fonema só** (o que você está avaliando agora).');
linhas.push(`> Ex.: fonema S = ${ler<Palavra[]>(todos.find((f) => f.symbol === 'S')?.words, []).length} palavras = ${ler<Palavra[]>(todos.find((f) => f.symbol === 'S')?.words, []).length * 2} arquivos.`);
linhas.push('');

const destino = 'docs/GUIA-MATERIAIS-GERADO.md';
writeFileSync(destino, linhas.join('\n'), 'utf8');
console.log(`✅ ${destino} — ${nPalavras} palavras em ${todos.length} fonemas`);
process.exit(0);