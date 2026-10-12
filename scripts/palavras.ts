/**
 * Lista TODAS as palavras usadas nos fonemas e nas atividades.
 * Serve para saber exatamente qual nome dar a cada arquivo de figura.
 *
 *   npm run db:palavras          -> lista completa
 *   npm run db:palavras s        -> só as palavras com "s"
 */
import { q } from '../src/db.js';

const chaveDe = (p: string) =>
  String(p ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

async function coleta(): Promise<Map<string, Set<string>>> {
  const mapa = new Map<string, Set<string>>();

  const add = (valor: any, origem: string) => {
    // aceita "sol" ou { word: "sol" }
    const bruto = typeof valor === 'object' && valor ? valor.word ?? valor.palavra : valor;
    const p = String(bruto ?? '').trim();
    if (!p || /[?{}[\]0-9]/.test(p)) return;
    // resposta de frase ("no lago") não vira figura; a fono usa emoji nesses casos
    if (p.includes(' ')) return;
    const chave = chaveDe(p);
    if (!chave) return;
    if (!mapa.has(chave)) mapa.set(chave, new Set());
    mapa.get(chave)!.add(origem);
  };

  // 1) palavras dos fonemas (campo JSON)
  for (const f of await q<any>('SELECT symbol, words FROM phonemes')) {
    const lista: any = typeof f.words === 'string' ? JSON.parse(f.words || '[]') : f.words ?? [];
    for (const w of Array.isArray(lista) ? lista : []) add(w, `fonema ${f.symbol}`);
  }

  // 2) palavras guardadas na configuração dos jogos
  for (const a of await q<any>('SELECT game_key, config FROM activity_plans')) {
    const cfg: any = typeof a.config === 'string' ? JSON.parse(a.config || '{}') : a.config ?? {};
    const andar = (v: any) => {
      if (Array.isArray(v)) return v.forEach(andar);
      if (v && typeof v === 'object') return;
      add(v, `jogo ${a.game_key}`);
    };
    for (const campo of ['words', 'pares', 'pairs', 'itens', 'opcoes', 'alvos', 'cartas'])
      if (cfg?.[campo]) andar(cfg[campo]);
    for (const qst of cfg?.questions ?? []) add(qst?.a, `jogo ${a.game_key}`);
  }

  return mapa;
}

const filtro = chaveDe(process.argv[2] ?? '');
const todos = await coleta();
const lista = [...todos.entries()]
  .filter(([chave]) => !filtro || chave.includes(filtro))
  .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

console.log(`\n${lista.length} palavra(s) para ilustrar:\n`);
for (const [chave, origens] of lista) console.log(`  ${chave.padEnd(20)} ${[...origens].join(', ')}`);
console.log('\nNome do arquivo = palavra, sem acento e sem espaço.');
console.log('Ex.: "Sol", "guarda-chuva" e "GuardaChuva" caem na mesma figura (chave "guardachuva").');
console.log('Palavras com interrogação (respostas de frase) ficam sem figura: use emoji.\n');

process.exit(0);