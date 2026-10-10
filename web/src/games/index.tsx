import { useEffect, useMemo, useState } from 'react';
import type { GameCtx, ActivityPlan } from './GameShell';
import { speech } from '../lib/speech';
import { AudioButton, emojiFor } from '../components/ui';
import type { ReactNode } from 'react';

/* ============================================================
   1. JOGO DA PONTARIA
   ============================================================ */
export function Pontaria({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const attempts = Number(activity.config?.attempts ?? 10);
  const cards: string[] = useMemo(
    () => activity.config?.cards ?? (activity.words ?? []).map((w: any) => w.word).slice(0, 5),
    [activity]
  );
  const [idx, setIdx] = useState(0);
  const word = cards[idx % Math.max(cards.length, 1)] ?? '';
  const [marked, setMarked] = useState<Record<number, '1' | 'erro'>>({});

  const marcar = async (pos: number) => {
    if (marked[pos]) return;
    setMarked({ ...marked, [pos]: '1' });
    // Sem classificação automática: o responsável marca, o sistema registra.
    await ctx.registerAttempt({ ref: word, position: pos, result: 'nao_avaliado' });
    speech.say('Muito bem! Vamos para a próxima.', { rate: 0.9 });
  };

  return (
    <>
      <h2 className="center">🎯 Jogo da Pontaria</h2>
      <p className="center muted">Ouça, diga e marque um círculo para cada tentativa.</p>
      <div className="row" style={{ justifyContent: 'center', margin: '1rem 0' }}>
        <div className="figura" onClick={() => speech.say(word)}>
          {emojiFor(word)}
        </div>
        <div>
          <div className="palavra-grande">{word}</div>
          <AudioButton word={word} />
          <div className="row" style={{ marginTop: '.5rem' }}>
            <button className="btn ghost small" onClick={() => speech.say(word)}>🔁 Repetir</button>
            <button className="btn ghost small" onClick={() => setIdx((i) => i + 1)}>Próxima figura ›</button>
          </div>
        </div>
      </div>
      <h3 className="center">Tentativas ({Object.keys(marked).length}/{attempts})</h3>
      <div className="circulos">
        {Array.from({ length: attempts }).map((_, i) => (
          <button
            key={i}
            className="circulo"
            data-marked={marked[i] ?? '0'}
            onClick={() => marcar(i)}
            aria-label={`Marcar tentativa ${i + 1}`}
          >
            {marked[i] ? '✓' : i + 1}
          </button>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   2. JOGO DA MEMÓRIA
   ============================================================ */
type Card = { id: number; pair: number; emoji: string; word: string; flip: boolean; done: boolean };

export function Memoria({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const pares = Number(activity.config?.pairs ?? 6);
  const palavras: string[] = useMemo(
    () =>
      activity.config?.words ??
      (activity.words ?? []).map((w: any) => w.word).slice(0, pares),
    [activity, pares]
  );
  const [cards, setCards] = useState<Card[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [acertos, setAcertos] = useState(0);

  useEffect(() => {
    const base = palavras.slice(0, Math.min(pares, palavras.length)).map((w, i) => ({ pair: i, emoji: emojiFor(w), word: w }));
    const duplicadas = [...base, ...base].map((c, i) => ({ id: i, ...c, flip: false, done: false }));
    setCards(duplicadas.sort(() => Math.random() - 0.5));
  }, [palavras, pares]);

  const clicar = async (i: number) => {
    if (cards[i].flip || cards[i].done || sel.length === 2) return;
    const novas = [...cards];
    novas[i].flip = true;
    setCards(novas);
    speech.say(cards[i].word);
    const selec = [...sel, i];
    setSel(selec);
    if (selec.length === 2) {
      const [a, b] = selec.map((x) => cards[x]);
      if (a.pair === b.pair) {
        setTimeout(() => {
          setCards((cs) => cs.map((c, x) => (x === a.id || x === b.id ? { ...c, done: true, flip: true } : c)));
          setAcertos((n) => n + 1);
          setSel([]);
          ctx.registerAttempt({ ref: a.word, result: 'nao_avaliado' });
        }, 700);
      } else {
        setTimeout(() => {
          setCards((cs) => cs.map((c, x) => (x === a.id || x === b.id ? { ...c, flip: false } : c)));
          setSel([]);
        }, 1100);
      }
    }
  };

  const total = palavras.length;
  return (
    <>
      <h2 className="center">🃏 Jogo da Memória</h2>
      <p className="center muted">Ache os pares. Diga o nome em voz alta ao revelar.</p>
      <div className="memoria-grid" style={{ marginTop: '1rem' }}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            className="carta"
            data-flip={c.flip ? '1' : '0'}
            data-done={c.done ? '1' : '0'}
            onClick={() => clicar(i)}
            aria-label={c.flip ? c.word : 'Carta virada'}
          >
            {c.flip ? c.emoji : '❓'}
          </button>
        ))}
      </div>
      {acertos === total && total > 0 && <p className="center stars">⭐⭐⭐</p>}
    </>
  );
}

/* ============================================================
   3. O QUE É? O QUE É?
   ============================================================ */
export function OQueE({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const perguntas: { q: string; a: string }[] = useMemo(
    () => activity.config?.questions ?? (activity.words ?? []).map((w: any) => ({ q: `O que começa com ${w.word[0].toUpperCase()}?`, a: w.word })),
    [activity]
  );
  const [i, setI] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const p = perguntas[i % Math.max(perguntas.length, 1)];

  const responder = async () => {
    setRevelado(true);
    speech.say(p?.a ?? '');
    await ctx.registerAttempt({ ref: p?.a, result: 'nao_avaliado', position: i });
  };

  if (!p) return <p>Sem perguntas cadastradas para esta atividade.</p>;

  return (
    <>
      <h2 className="center">🗣️ O que é? O que é?</h2>
      <div className="game-area" style={{ margin: '1rem 0' }}>
        <p className="center" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{p.q}</p>
        <p className="center muted">Pergunta {i + 1} de {perguntas.length}</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn lg sun" onClick={responder}>👀 Ver a resposta</button>
          <button className="btn secondary" onClick={() => speech.say(p.q)}>🔊 Ouvir a pergunta</button>
        </div>
        {revelado && (
          <div className="center" style={{ marginTop: '1rem' }}>
            <div className="figura">{emojiFor(p.a)}</div>
            <div className="palavra-grande">{p.a}</div>
            <AudioButton word={p.a} />
          </div>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => { setRevelado(false); setI((n) => n + 1); }}>Próxima ›</button>
      </div>
    </>
  );
}

/* ============================================================
   4. ENCONTRE O INTRUSO
   ============================================================ */
export function Intruso({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const grupo: string[] = activity.config?.group ?? (activity.words ?? []).map((w: any) => w.word);
  const intruso = activity.config?.intruso ?? 'intruso';
  const todos = [...grupo, intruso].sort(() => Math.random() - 0.5);
  const [escolhido, setEscolhido] = useState<string | null>(null);

  const pick = async (item: string) => {
    setEscolhido(item);
    await ctx.registerAttempt({ ref: item, result: 'nao_avaliado' });
  };

  return (
    <>
      <h2 className="center">🔍 Encontre o Intruso</h2>
      <p className="center muted">Qual NÃO pertence ao grupo?</p>
      <div className="grid cols-3" style={{ marginTop: '1rem' }}>
        {todos.map((item) => (
          <button
            key={item}
            className="btn secondary lg"
            style={{ flexDirection: 'column', height: 'auto', padding: '1rem' }}
            onClick={() => pick(item)}
          >
            <span style={{ fontSize: '2.5rem' }}>{emojiFor(item)}</span>
            {item}
          </button>
        ))}
      </div>
      {escolhido && (
        <p className="center" style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
          Você escolheu <strong>{escolhido}</strong>. Conte ao responsável o seu porquê! 💛
        </p>
      )}
    </>
  );
}

/* ============================================================
   5. ÁLBUM DE FIGURAS
   ============================================================ */
export function Album({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const palavras: string[] = useMemo(
    () => activity.config?.words ?? (activity.words ?? []).map((w: any) => w.word),
    [activity]
  );
  const [vistos, setVistos] = useState<Record<string, boolean>>({});
  const [atual, setAtual] = useState(palavras[0] ?? '');

  const mostrar = async (w: string) => {
    setAtual(w);
    speech.say(w);
    setVistos((v) => ({ ...v, [w]: true }));
    await ctx.registerAttempt({ ref: w, result: 'nao_avaliado' });
  };

  return (
    <>
      <h2 className="center">📖 Álbum de Figuras</h2>
      <div className="center" style={{ margin: '1rem 0' }}>
        <div className="figura">{emojiFor(atual)}</div>
        <div className="palavra-grande">{atual}</div>
        <AudioButton word={atual} />
        <div className="row" style={{ justifyContent: 'center', marginTop: '.5rem' }}>
          <button className="btn ghost" onClick={() => speech.say(atual)}>🔁 Repetir a demonstração</button>
        </div>
      </div>
      <div className="grid cols-4">
        {palavras.map((w) => (
          <button key={w} className="btn secondary" onClick={() => mostrar(w)} style={{ flexDirection: 'column' }}>
            <span style={{ fontSize: '2rem' }}>{emojiFor(w)}</span>
            <small>{vistos[w] ? '✓ ' : ''}{w}</small>
          </button>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   6. FICHA DE VOGAIS E SÍLABAS
   ============================================================ */
export function VogaisSilabas({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const vogais = 'aeiou'.split('');
  const silabas: string[] = activity.config?.syllables ?? activity.syllables ?? [];
  const [alvo, setAlvo] = useState(silabas[0] ?? 'sa');

  return (
    <>
      <h2 className="center">🔤 Ficha de Vogais e Sílabas</h2>
      <p className="center muted">Leia junto, alternando entre vogais e sílabas.</p>
      <div className="row" style={{ justifyContent: 'center', margin: '1rem 0' }}>
        {vogais.map((v) => (
          <button key={v} className="btn secondary lg" onClick={() => speech.say(activity.symbol?.toLowerCase() + v, { rate: 0.6 })}>
            {activity.symbol?.toLowerCase()}{v}
          </button>
        ))}
      </div>
      <div className="circulos">
        {silabas.map((s) => (
          <button
            key={s}
            className="circulo"
            style={{ width: 'auto', minWidth: '4.2rem', height: 'auto', padding: '.6rem 1rem', borderRadius: 999, fontSize: '1.2rem', fontWeight: 800, border: '4px solid var(--amarelo)', background: alvo === s ? 'var(--amarelo-claro)' : '#fff' }}
            onClick={() => { setAlvo(s); speech.say(s, { rate: 0.6 }); }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button
          className="btn sun"
          onClick={async () => {
            speech.say(alvo, { rate: 0.55 });
            await ctx.registerAttempt({ ref: alvo, result: 'nao_avaliado' });
          }}
        >
          🔊 Ouvir e repetir: {alvo}
        </button>
      </div>
    </>
  );
}

/* ============================================================
   7. HISTÓRIAS FALANTES
   ============================================================ */
export function Historias({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const cenas: { c: string; q: string; a: string }[] = activity.config?.scenes ??
    (activity.sentences ?? []).map((s: string, i: number) => ({ c: `Cena ${i + 1}`, q: 'O que aconteceu nesta cena?', a: s }));
  const [i, setI] = useState(0);
  const cena = cenas[i % Math.max(cenas.length, 1)];
  if (!cena) return <p>Sem cenas cadastradas.</p>;

  return (
    <>
      <h2 className="center">📚 Histórias Falantes</h2>
      <div className="game-area" style={{ margin: '1rem 0' }}>
        <h3 className="center">{cena.c}</h3>
        <div className="figura" style={{ background: 'var(--lilas)', borderColor: 'var(--roxo)' }}>🖼️</div>
        <p className="center" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{cena.q}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn secondary" onClick={() => speech.say(cena.q)}>🔊 Ouvir</button>
          <button className="btn ghost small" onClick={() => speech.say(cena.a)}>💡 Ver modelo de frase</button>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={async () => { setI((n) => n + 1); await ctx.registerAttempt({ ref: cena.c, result: 'nao_avaliado' }); }}>
          Próxima cena ›
        </button>
      </div>
    </>
  );
}

/* ============================================================
   8. INSTALAÇÃO DO FONEMA
   Sequência inserida pela fonoaudióloga — nada é gerado automaticamente.
   ============================================================ */
export function Instalacao({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const seq: any[] = activity.config?.sequence ?? [];
  const [step, setStep] = useState(0);
  const atual = seq[step];

  if (!seq.length) {
    return (
      <div className="alert info">
        <strong>Instalação do Fonema</strong>
        <p style={{ margin: '.4rem 0' }}>
          Esta atividade ainda não tem sequência cadastrada. A fonoaudióloga insere aqui os
          exercícios e modelos de fala — o sistema <strong>não gera instruções clínicas automaticamente</strong>.
        </p>
        {activity.symbol && <p style={{ margin: 0 }}>Fonema-alvo desta atividade: <strong>{activity.symbol}</strong></p>}
      </div>
    );
  }

  return (
    <>
      <h2 className="center">🧩 Instalação do Fonema</h2>
      <p className="center muted">Passo {step + 1} de {seq.length} — sequência da fonoaudióloga</p>
      <div className="game-area" style={{ margin: '1rem 0' }}>
        <h3>{atual?.title ?? `Passo ${atual?.step ?? step + 1}`}</h3>
        <p style={{ fontSize: '1.15rem' }}>{atual?.description ?? atual?.texto ?? ''}</p>
        {atual?.ref && <p className="muted">Referência: {atual.ref}</p>}
        <div className="row">
          <button className="btn secondary" onClick={() => speech.say(atual?.texto ?? atual?.description ?? '')}>🔊 Ouvir</button>
          {atual?.modelo && <button className="btn ghost small" onClick={() => speech.say(atual.modelo)}>🗣️ Modelo de fala</button>}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>‹ Voltar</button>
        <button
          className="btn"
          onClick={async () => {
            await ctx.registerAttempt({ ref: `passo-${step + 1}`, position: step, result: 'nao_avaliado' });
            setStep((s) => Math.min(seq.length - 1, s + 1));
          }}
        >
          Próximo passo ›
        </button>
      </div>
    </>
  );
}

/* ============================================================
   REGISTRO DE JOGOS — para adicionar novos jogos sem reescrever o app.
   ============================================================ */
type GameComponent = (p: { activity: ActivityPlan; ctx: GameCtx }) => ReactNode;

export const GAME_REGISTRY: Record<string, GameComponent> = {
  pontaria: Pontaria,
  memoria: Memoria,
  o_que_e: OQueE,
  intruso: Intruso,
  album: Album,
  vogais_silabas: VogaisSilabas,
  historias: Historias,
  instalacao: Instalacao,
};

export function renderGame(activity: ActivityPlan, ctx: GameCtx): ReactNode {
  const G = GAME_REGISTRY[activity.game_key];
  if (!G) {
    return (
      <div className="alert warn">
        Jogo <strong>{activity.game_key}</strong> ainda não implementado nesta versão. A fonoaudióloga
        pode defini-lo no painel dela.
      </div>
    );
  }
  return G({ activity, ctx });
}