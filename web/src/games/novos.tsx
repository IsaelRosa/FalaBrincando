import { useEffect, useMemo, useState } from 'react';
import type { GameCtx, ActivityPlan } from './GameShell';
import { speech } from '../lib/speech';
import { AudioButton, emojiFor } from '../components/ui';
import type { ReactNode } from 'react';

/* Palavras de apoio quando a atividade vem sem configuração específica. */
const ANIMAIS = ['gato','cachorro','girafa','leão','coelho','elefante','pinguim','raposa','cavalo','tartaruga','sapo','panda','morcego','castor','golfinho'];
const COMIDA = ['maçã','banana','pão','leite','ovos','arroz','melancia','cenoura'];
const OBJETOS = ['bola','chave','guarda-chuva','sapato','copo','caderno','relógio','boneca'];
const HISTORIAS = [
  { titulo: 'A semente que virou árvore', cenas: [
    {emoji:'🌰', q:'O que foi plantado?', a:'Uma semente', fala:'A menina plantou uma semente.'},
    {emoji:'💧', q:'O que ela fez todo dia?', a:'Regou', fala:'Ela regou todos os dias.'},
    {emoji:'🌳', q:'O que cresceu no fim?', a:'Uma árvore', fala:'A semente virou uma árvore grande.'},
  ]},
  { titulo: 'O gato que perdeu o cachecol', cenas: [
    {emoji:'🐈', q:'O que o gato perdeu?', a:'O cachecol', fala:'O gato perdeu o cachecol.'},
    {emoji:'❄️', q:'Que frio estava?', a:'Frio', fala:'Estava muito frio.'},
    {emoji:'🧣', q:'Quem ajudou o gato?', a:'A menina', fala:'A menina ajudou o gato.'},
  ]},
];

function embaralhar<T>(lista: T[]): T[] {
  return [...lista].sort(() => Math.random() - 0.5);
}

/* ============================================================
   1. CAÇA AOS SONS — achar figuras que começam/com o som
   ============================================================ */
export function CacaSons({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const [alvos, neutros] = useMemo(() => {
    const cfg = activity.config ?? {};
    const cfgAlvos: string[] = cfg.fgrupo?.alvo ?? cfg.alvo ?? [];
    const cfgNeutros: string[] = cfg.fgrupo?.neutros ?? cfg.neutros ?? [];
    const doFonema: string[] = (activity.words ?? []).map((w: any) => w.word);
    return [
      cfgAlvos.length ? cfgAlvos : doFonema.slice(0, 4),
      cfgNeutros.length ? cfgNeutros : (['chave','bola','mesa','sapato','gato','pão']).filter((x) => !doFonema.includes(x)).slice(0, 2),
    ];
  }, [activity]);

  const [alvo, setAlvo] = useState(0);
  const [achados, setAchados] = useState<string[]>([]);
  const som = activity.symbol?.toLowerCase() ?? '';
  const tentativas = Number(activity.config?.tentativas ?? 2);
  const alvoAtual = alvos[alvo % Math.max(alvos.length, 1)] ?? '';

  const clicar = async (figura: string) => {
    const correta = alvos.includes(figura);
    await ctx.registerAttempt({ ref: figura, result: correta ? 'nao_avaliado' : 'nao_avaliado' });
    if (correta) {
      setAchados((a) => [...a, figura]);
      speech.say(`Isso! ${figura} começa com ${som}`, { rate: 0.75 });
    } else {
      speech.say(`${figura} não começa com ${som}. Vamos tentar outro!`, { rate: 0.85 });
    }
  };

  const todos = embaralhar([...alvos, ...neutros]);

  if (!alvos.length) return <MensagemVazia game="Caça aos Sons" />;

  return (
    <>
      <h2 className="center">🔎 Caça aos Sons</h2>
      <p className="center muted">Ache as figuras cujo nome começa com o som <strong>{activity.symbol}</strong>.</p>
      <div className="center" style={{ margin: '1rem 0' }}>
        <button className="btn sun lg" onClick={() => speech.say(som + som + som, { rate: 0.5 })}>
          🔊 Ouvir o som: {som}{som}{som}
        </button>
      </div>
      <p className="center muted">Som alvo {alvo + 1} de {alvos.length} · {achados.length} encontrada(s)</p>
      <div className="center" style={{ marginBottom: '.5rem' }}>
        <span className="pill sun">Procurando: {alvoAtual}</span>
      </div>
      <div className="grid cols-4">
        {todos.map((fig) => {
          const achou = achados.includes(fig);
          return (
            <button key={fig} className={`btn ${achou ? 'green' : 'secondary'}`} style={{ flexDirection: 'column', height: 'auto', padding: '1rem' }}
              onClick={() => clicar(fig)}>
              <span style={{ fontSize: '2.5rem' }}>{emojiFor(fig)}</span>
              <small>{achou ? '✓ ' : ''}{fig}</small>
            </button>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button className="btn" onClick={() => setAlvo((a) => (a + 1) % Math.max(alvos.length, 1))}>Próximo som ›</button>
        <span className="muted">{tentativas} subsidárias por som — sem perder pontos.</span>
      </div>
    </>
  );
}

/* ============================================================
   2. MUNDO DOS ANIMAIS — nomear animais e sons
   ============================================================ */
export function MundoAnimais({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const lista: string[] = useMemo(() => {
    const cfg = activity.config?.animais;
    const doFonema = (activity.words ?? []).map((w: any) => w.word);
    return (cfg?.length ? cfg : doFonema.length ? doFonema : ANIMAIS).slice(0, 8);
  }, [activity]);

  const [atual, setAtual] = useState(0);
  const [visto, setVisto] = useState<number[]>([]);
  const animal = lista[atual % Math.max(lista.length, 1)] ?? '';

  const ver = async () => {
    setVisto((v) => (v.includes(atual) ? v : [...v, atual]));
    await ctx.registerAttempt({ ref: animal, result: 'nao_avaliado' });
  };

  if (!lista.length) return <MensagemVazia game="Mundo dos Animais" />;

  return (
    <>
      <h2 className="center">🐾 Mundo dos Animais</h2>
      <p className="center muted">Ouça, veja e diga o nome do animal.</p>
      <div className="game-area" style={{ margin: '1rem 0', textAlign: 'center' }}>
        <div className="figura" style={{ fontSize: '5rem' }}>{emojiFor(animal)}</div>
        <div className="palavra-grande">{visto.includes(atual) ? animal : '?'.repeat(Math.min(animal.length, 5))}</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn sun" onClick={() => speech.say(animal, { rate: 0.7 })}>🔊 Ouvir o nome</button>
          <button className="btn" onClick={ver}>👀 Mostrar o nome</button>
          <AudioButton word={animal} />
        </div>
      </div>
      <div className="grid cols-4">
        {lista.map((a, i) => (
          <button key={a + i} className={`btn ${i === atual ? '' : 'ghost'}`} style={{ flexDirection: 'column' }}
            onClick={() => setAtual(i)}>
            <span style={{ fontSize: '2rem' }}>{emojiFor(a)}</span>
            <small>{visto.includes(i) ? a : '???'}</small>
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button className="btn" onClick={() => setAtual((i) => (i + 1) % lista.length)}>Próximo animal ›</button>
      </div>
    </>
  );
}

/* ============================================================
   3. MONTE A PALAVRA — sílabas -> palavra
   ============================================================ */
export function MontePalavra({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const palavras: string[] = useMemo(() => {
    const cfg = activity.config?.palavras;
    const doFonema = (activity.words ?? []).map((w: any) => w.word);
    return (cfg?.length ? cfg : doFonema.length ? doFonema : ['mesa','bola','casa']).slice(0, 5);
  }, [activity]);

  const [i, setI] = useState(0);
  const palavra = palavras[i % Math.max(palavras.length, 1)] ?? '';
  const silabas = useMemo(() => separarSilabas(palavra), [palavra]);
  const [montada, setMontada] = useState<number[]>([]);
  const [usadas, setUsadas] = useState<number[]>([]);

  useEffect(() => { setMontada([]); setUsadas([]); }, [palavra]);

  const clicar = (idx: number) => {
    if (usadas.includes(idx)) return;
    const nova = [...montada, idx];
    setMontada(nova);
    setUsadas(usadas.includes(idx) ? usadas : [...usadas, idx]);
    speech.say(silabas[idx], { rate: 0.55 });
    if (nova.length === silabas.length) {
      setTimeout(async () => {
        const formou = nova.map((x) => silabas[x]).join('').toLowerCase() === palavra.toLowerCase();
        speech.say(formou ? `${palavra}! Muito bem!` : `${palavra}. Vamos tentar de novo?`, { rate: 0.85 });
        await ctx.registerAttempt({ ref: palavra, result: 'nao_avaliado' });
      }, 400);
    }
  };

  if (!palavras.length) return <MensagemVazia game="Monte a Palavra" />;

  return (
    <>
      <h2 className="center">🧩 Monte a Palavra</h2>
      <p className="center muted">Toque nas sílabas na ordem certa para formar a palavra.</p>
      <div className="center" style={{ margin: '1rem 0' }}>
        <div className="figura">{emojiFor(palavra)}</div>
        <div className="palavra-grande">
          {montada.length ? montada.map((x) => silabas[x]).join('-') : '＿'.repeat(silabas.length)}
        </div>
        <AudioButton word={palavra} />
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {embaralhar(silabas.map((_, idx) => idx)).map((idx) => (
          <button key={idx} className="btn sun lg" disabled={usadas.includes(idx)} onClick={() => clicar(idx)}>
            {silabas[idx]}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button className="btn ghost" onClick={() => speech.say(silabas.join(' '), { rate: 0.5 })}>🔁 Ouvir as sílabas</button>
        <button className="btn" onClick={() => { setI((n) => n + 1); }}>Próxima palavra ›</button>
      </div>
    </>
  );
}

/**
 * Separação silábica para o jogo Monte a Palavra.
 * Regras: (1) sequência de vogais = um núcleo; (2) o maior núcleo define a
 * sílaba inicial; (3) cada sílaba = consoantes pendentes + núcleo.
 * Nunca perde letras — a fonoaudióloga pode substituir por divisão exata.
 */
export function separarSilabas(palavra: string): string[] {
  const VOGAIS = new Set('aeiouáéíóúâêôãõü'.split(''));
  const p = (palavra ?? '').toLowerCase().normalize('NFC').replace(/[^a-zà-ú]/g, '');
  if (!p) return [];

  const unidades: string[] = [];
  for (let i = 0; i < p.length; ) {
    if (VOGAIS.has(p[i])) {
      let j = i;
      while (j + 1 < p.length && VOGAIS.has(p[j + 1])) j++;
      unidades.push(p.slice(i, j + 1));
      i = j + 1;
    } else {
      unidades.push(p[i]);
      i++;
    }
  }

  let nucleo = unidades.findIndex((u) => VOGAIS.has(u[0]));
  if (nucleo < 0) return [p];
  for (let i = nucleo + 1; i < unidades.length; i++) {
    if (VOGAIS.has(unidades[i][0]) && unidades[i].length > unidades[nucleo].length) nucleo = i;
  }

  const silabas: string[] = [];
  let pendente = unidades.slice(0, nucleo).join('');
  for (let i = nucleo; i < unidades.length; i++) {
    const u = unidades[i];
    if (VOGAIS.has(u[0])) { silabas.push(pendente + u); pendente = ''; }
    else pendente += u;
  }
  if (pendente) {
    if (silabas.length) silabas[silabas.length - 1] += pendente;
    else silabas.push(pendente);
  }
  return silabas.filter(Boolean);
}

/* ============================================================
   4. HISTÓRIA INTERATIVA — completar e responder
   ============================================================ */
export function HistoriaInterativa({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const historias = useMemo(() => {
    const cfg = activity.config?.historia;
    if (cfg?.cenas?.length) return [{ titulo: cfg.titulo ?? 'História', cenas: cfg.cenas }];
    return HISTORIAS;
  }, [activity]);

  const [h, setH] = useState(0);
  const [c, setC] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const story = historias[h % historias.length];
  const cena = story.cenas[c % story.cenas.length];

  const responder = async () => {
    setRevelado(true);
    await ctx.registerAttempt({ ref: cena.q, position: c, result: 'nao_avaliado' });
  };

  const proximo = () => {
    setRevelado(false);
    if (c + 1 < story.cenas.length) setC(c + 1);
    else { setC(0); setH((x) => (x + 1) % historias.length); }
  };

  return (
    <>
      <h2 className="center">📖 História Interativa</h2>
      <h3 className="center">{story.titulo}</h3>
      <p className="center muted">Cena {c + 1} de {story.cenas.length}</p>
      <div className="game-area" style={{ margin: '1rem 0', textAlign: 'center' }}>
        <div className="figura" style={{ fontSize: '5rem' }}>{cena.emoji ?? '🖼️'}</div>
        <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{cena.q}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn secondary" onClick={() => speech.say(cena.q)}>🔊 Ouvir</button>
          <button className="btn" onClick={responder}>💡 Ver a resposta</button>
        </div>
        {revelado && (
          <div style={{ marginTop: '1rem' }}>
            <div className="palavra-grande">{cena.a}</div>
            <p>{cena.fala}</p>
            <AudioButton word={cena.a} />
          </div>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" onClick={() => { setRevelado(false); setC(Math.max(0, c - 1)); }}>‹ Voltar</button>
        <button className="btn" onClick={proximo}>Próxima cena ›</button>
      </div>
    </>
  );
}

/* ============================================================
   5. QUAL É A FIGURA? — identificar por pistas
   ============================================================ */
export function QualFigura({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const itens = useMemo(() => {
    const cfg = activity.config?.pistas;
    if (cfg?.length) return cfg;
    const base: string[] = (activity.words ?? []).map((w: any) => w.word);
    return (base.length ? base : OBJETOS).slice(0, 4).map((palavra, i) => ({
      palavra,
      pista: i === 0 ? 'Começa com um som grandão.' : 'É uma coisa que a gente usa todo dia.',
      resposta: i === 0 ? 'Sol' : 'Uma coisa do dia a dia.',
    }));
  }, [activity]);

  const [i, setI] = useState(0);
  const item = itens[i % Math.max(itens.length, 1)];

  if (!item?.pista) return <MensagemVazia game="Qual é a Figura?" />;

  return (
    <>
      <h2 className="center">❓ Qual é a Figura?</h2>
      <p className="center muted">Ouça a pista e adivinhe.</p>
      <div className="game-area" style={{ margin: '1rem 0', textAlign: 'center' }}>
        <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>“{item.pista}”</p>
        <button className="btn secondary" onClick={() => speech.say(item.pista)}>🔊 Ouvir a pista</button>
      </div>
      <div className="grid cols-4">
        {itens.map((x: any) => (
          <button key={x.palavra} className="btn secondary" style={{ flexDirection: 'column', height: 'auto', padding: '1rem' }}
            onClick={async () => {
              speech.say(`${x.palavra}!`, { rate: 0.8 });
              await ctx.registerAttempt({ ref: x.palavra, result: 'nao_avaliado' });
              setI(itens.indexOf(x) + 1);
            }}>
            <span style={{ fontSize: '2.5rem' }}>{emojiFor(x.palavra)}</span>
            <small>{x.palavra}</small>
          </button>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   6. ROLETA DAS PALAVRAS — sortear
   ============================================================ */
export function Roleta({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const [palavras, setPalavras] = useState<string[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const [girando, setGirando] = useState(false);

  const Banco = useMemo(() => {
    const cfg = activity.config;
    const doFonema = (activity.words ?? []).map((w: any) => w.word);
    if (cfg?.palavras?.length) return cfg.palavras;
    if (cfg?.temas?.length) return cfg.temas;
    if (doFonema.length) return doFonema;
    return [...COMIDA, ...OBJETOS];
  }, [activity]);

  const girar = async () => {
    if (!Banco.length) return;
    setGirando(true);
    speech.stop();
    const escolhido = Banco[Math.floor(Math.random() * Banco.length)];
    setAtual(escolhido);
    setPalavras((p) => (p.includes(escolhido) ? p : [...p, escolhido]));
    await ctx.registerAttempt({ ref: escolhido, result: 'nao_avaliado' });
    setTimeout(() => { setGirando(false); speech.say(escolhido, { rate: 0.7 }); }, 500);
  };

  return (
    <>
      <h2 className="center">🎡 Roleta das Palavras</h2>
      <p className="center muted">Gire a roleta e pratique a palavra sorteada.</p>
      <div className="center" style={{ margin: '1.5rem 0' }}>
        <div className={`figura ${girando ? 'float' : ''}`} style={{ borderRadius: '50%', fontSize: '3rem' }}>
          {atual ? emojiFor(atual) : '🎯'}
        </div>
        <div className="palavra-grande">{atual ?? 'gire a roleta!'}</div>
        {atual && <AudioButton word={atual} />}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn lg sun" onClick={girar} disabled={girando}>
          {girando ? '🎡 Girando...' : '🎡 Girar a roleta'}
        </button>
      </div>
      {palavras.length > 0 && (
        <>
          <h3 className="center" style={{ marginTop: '1.5rem' }}>Já sorteadas ({palavras.length})</h3>
          <div className="row" style={{ justifyContent: 'center' }}>
            {palavras.map((p) => <span key={p} className="pill green">{emojiFor(p)} {p}</span>)}
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================
   7. MISSÕES DA COMUNICAÇÃO — situações cotidianas
   ============================================================ */
export function Missoes({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const missoes = useMemo(() => {
    const cfg = activity.config?.situacoes ?? activity.config?.missoes;
    if (cfg?.length) return cfg;
    if (activity.config?.sentimentos) {
      return activity.config.sentimentos.map((s: string) => ({
        c: 'sentimento', p: `Como a pessoa está se sentindo? Pense em ${s}.`,
        resposta: s, opcoes: [s, 'feliz', 'triste', 'cansado'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
      }));
    }
    return [
      { c: 'loja', p: 'Você está na loja e quer uma bola. O que você diz?', resposta: 'Eu quero uma bola.', opcoes: ['Eu quero uma bola.', 'A bola.', 'Ali.'] },
      { c: 'casa', p: 'Você está em casa e quer a mamãe. O que você diz?', resposta: 'Mãe, aqui!', opcoes: ['Mãe, aqui!', 'Mãe.', 'Aqui.'] },
      { c: 'escola', p: 'Você precisa de ajuda na escola. O que você diz?', resposta: 'Pode me ajudar?', opcoes: ['Pode me ajudar?', 'Socorro!', 'Ajuda.'] },
    ];
  }, [activity]);

  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const m = missoes[i % Math.max(missoes.length, 1)];

  if (!m?.p) return <MensagemVazia game="Missões da Comunicação" />;

  return (
    <>
      <h2 className="center">🗺️ Missões da Comunicação</h2>
      <div className="game-area" style={{ margin: '1rem 0' }}>
        <span className="pill">Situação: {m.c}</span>
        <p style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '.8rem' }}>{m.p}</p>
        <button className="btn secondary" onClick={() => speech.say(m.p)}>🔊 Ouvir a situação</button>
        <div className="row" style={{ marginTop: '1rem' }}>
          {(m.opcoes ?? []).map((o: string) => (
            <button key={o} className={`btn ${escolha === o ? 'sun' : 'ghost'}`} onClick={async () => {
              setEscolha(o);
              await ctx.registerAttempt({ ref: m.c, result: 'nao_avaliado' });
              speech.say(o === m.resposta ? 'Muito bem! Essa é uma boa forma de pedir.' : 'Tudo bem! Vamos ver outra forma de dizer.', { rate: 0.85 });
            }}>{o}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: '.8rem' }}>
          <button className="btn ghost small" onClick={() => speech.say(m.resposta)}>💡 Ouvir um modelo</button>
          <span className="muted">Qualquer tentativa de comunicar é válida.</span>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => { setEscolha(null); setI((n) => n + 1); }}>Próxima missão ›</button>
      </div>
    </>
  );
}

/* ============================================================
   8. TRILHA DA AVENTURA — avançar em etapas
   ============================================================ */
export function TrilhaAventura({ activity, ctx }: { activity: ActivityPlan; ctx: GameCtx }) {
  const etapas: string[] = useMemo(() => {
    const cfg = activity.config?.etapas;
    if (cfg?.length) return cfg;
    return ['Ouvir o som-alvo', 'Dizer o som junto', 'Falar uma palavra', 'Falar uma frase', 'Falar em casa'];
  }, [activity]);

  const [atual, setAtual] = useState(0);
  const emojiEtapa = ['👂', '👄', '🖼️', '💬', '🏡', '⭐'];

  const avancar = async () => {
    await ctx.registerAttempt({ ref: etapas[atual], position: atual, result: 'nao_avaliado' });
    speech.say('Muito bem! Vamos seguir em frente.', { rate: 0.9 });
    setAtual((a) => Math.min(etapas.length - 1, a + 1));
  };

  return (
    <>
      <h2 className="center">🗺️ Trilha da Aventura</h2>
      <p className="center muted">Cada étape é uma aventura. Pode ir no seu tempo.</p>
      <div className="trilha" style={{ marginTop: '1.5rem' }}>
        {etapas.map((e, i) => (
          <div key={e + i} className="trilho-step" data-status={i < atual ? 'concluida' : i === atual ? 'ativa' : 'pausada'}
            style={{ background: i <= atual ? '#7fb069' : '#b8aec4' }}>
            <div className="num">{emojiEtapa[i % emojiEtapa.length]}</div>
            <h4>{e}</h4>
            <div style={{ marginTop: '.4rem', fontSize: '.85rem' }}>{i < atual ? '✓ feito' : i === atual ? '👉 agora' : '🔒 depois'}</div>
          </div>
        ))}
      </div>
      <div className="center">
        <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>Agora: {etapas[atual]}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn secondary" onClick={() => speech.say(etapas[atual])}>🔊 Ouvir</button>
          <button className="btn" onClick={avancar}>✅ Fiz! Próxima etapa ›</button>
          {atual > 0 && <button className="btn ghost" onClick={() => setAtual((a) => a - 1)}>‹ Voltar</button>}
        </div>
      </div>
    </>
  );
}

/* ---------- Auxiliar ---------- */
function MensagemVazia({ game }: { game: string }) {
  return (
    <div className="alert info">
      <strong>{game}</strong>
      <p style={{ margin: '.4rem 0' }}>
        Esta atividade ainda não tem conteúdo configurado. A fonoaudióloga define as palavras e
        imagens no painel dela.
      </p>
    </div>
  );
}

export type { GameCtx, ActivityPlan };
export const JOGOS_NOVOS: Record<string, any> = {
  caca_sons: CacaSons,
  mundo_animais: MundoAnimais,
  monte_palavra: MontePalavra,
  historia_interativa: HistoriaInterativa,
  qual_figura: QualFigura,
  roleta: Roleta,
  missoes: Missoes,
  trilha: TrilhaAventura,
};

export type { ReactNode };