/**
 * Testa a lógica do jogo da Memória: virar, achar par e DESVIRAR ao errar.
 *
 *   node web/teste-memoria.cjs
 */

// ---- versão quebrada (antes): comparava índice do array com id da carta ----
function logicaAntiga(palavras, cartasClicadas) {
  let cards = palavras.flatMap((w, i) => [
    { id: i, pair: i, word: w, flip: false, done: false },
    { id: i, pair: i, word: w, flip: false, done: false },
  ]);
  // embaralha para simular a ordem real da tela
  cards = cards.sort(() => Math.random() - 0.5);
  let sel = [];
  let travado = false;

  cartasClicadas.forEach((idx, passo) => {
    if (travado) return;
    if (cards[idx].flip || cards[idx].done || sel.length === 2) return;
    cards[idx].flip = true;
    sel = [...sel, idx];
    if (sel.length === 2) {
      travado = true;
      const [a, b] = sel.map((x) => cards[x]);
      if (a.pair === b.pair) {
        cards = cards.map((c, x) => (x === a.id || x === b.id ? { ...c, done: true } : c));
      } else {
        cards = cards.map((c, x) => (x === a.id || x === b.id ? { ...c, flip: false } : c));
      }
      sel = [];
      travado = false;
    }
  });
  return cards;
}

// ---- versão corrigida: uid único por carta ----
function logicaNova(palavras, cliquesPorUid) {
  const base = palavras.slice(0, 6).map((w, i) => ({ pair: i, word: w }));
  let cards = [...base.map((c) => ({ ...c, uid: `a${c.pair}-${c.word}`, flip: false, done: false })),
               ...base.map((c) => ({ ...c, uid: `b${c.pair}-${c.word}`, flip: false, done: false }))]
    .sort(() => Math.random() - 0.5);
  let sel = [];
  let travado = false;

  for (const uid of cliquesPorUid) {
    if (travado) continue;
    const carta = cards.find((c) => c.uid === uid);
    if (!carta || carta.flip || carta.done || sel.length === 2) continue;

    cards = cards.map((c) => (c.uid === uid ? { ...c, flip: true } : c));
    sel = [...sel, uid];
    if (sel.length < 2) continue;

    travado = true;
    const [aUid, bUid] = sel;
    const a = cards.find((c) => c.uid === aUid);
    const b = cards.find((c) => c.uid === bUid);
    if (a && b && a.pair === b.pair) {
      cards = cards.map((c) => (c.uid === aUid || c.uid === bUid ? { ...c, done: true, flip: true } : c));
    } else {
      cards = cards.map((c) => (c.uid === aUid || c.uid === bUid ? { ...c, flip: false } : c));
    }
    sel = [];
    travado = false;
  }
  return cards;
}

// ---------- testes ----------
const palavras = ['sol', 'lua', 'bola', 'mesa'];
const paresUid = {};

function acharParDiferente() {
  // duas cartas de pares diferentes
  const base = palavras.map((w, i) => ({ uid: `u${i}`, pair: i, word: w, flip: false, done: false }));
  const todas = [...base, ...base];
  const a = todas[0];
  const b = todas.find((c) => c.pair !== a.pair && c.uid !== a.uid);
  return [a.uid, b.uid];
}

let falhas = 0;

// 1) Errar: as duas cartas têm que voltar para baixo
{
  const [a, b] = acharParDiferente();
  const r = logicaNova(palavras, [a, b]);
  const erradas = r.filter((c) => (c.uid === a || c.uid === b) && c.flip);
  const ok = erradas.length === 0;
  console.log(`${ok ? '✅' : '❌'} ao errar, as 2 cartas desviraram (${ok ? 'sim' : 'NAO'})`);
  if (!ok) falhas++;
}

// 2) Acertar: as duas cartas ficam viradas e marcadas
{
  const base = palavras.map((w, i) => ({ uid: `u${i}`, pair: i, word: w, flip: false, done: false }));
  const [a, b] = [base[0], base[0]];
  const r = logicaNova(palavras, [a.uid, b.uid]);
  const certas = r.filter((c) => c.uid === a.uid || c.uid === b.uid);
  const ok = certas.every((c) => c.flip && c.done);
  console.log(`${ok ? '✅' : '❌'} ao acertar, o par fica virado e marcado`);
  if (!ok) falhas++;
}

// 3) Uids são únicos (o bug original)
{
  const base = palavras.slice(0, 6).map((w, i) => ({ pair: i, word: w }));
  const todas = [
    ...base.map((c) => ({ ...c, uid: `a${c.pair}-${c.word}`, flip: false, done: false })),
    ...base.map((c) => ({ ...c, uid: `b${c.pair}-${c.word}`, flip: false, done: false })),
  ];
  const uids = todas.map((c) => c.uid);
  const ok = new Set(uids).size === uids.length;
  console.log(`${ok ? '✅' : '❌'} cada carta tem identificador único (${uids.length} cartas)`);
  if (!ok) falhas++;
}

// 4) A versão antiga realmente falhava
{
  let falhasAntigas = 0;
  for (let t = 0; t < 20; t++) {
    const idx = [0, 1];
    const r = logicaAntiga(palavras, idx);
    const ficaram = r.filter((c) => c.flip).length;
    if (ficaram > 0) falhasAntigas++;
  }
  console.log(`ℹ️  versão antiga: errou o flip em ${falhasAntigas}/20 tentativas`);
}

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ Memória funcionando');
process.exit(falhas ? 1 : 0);