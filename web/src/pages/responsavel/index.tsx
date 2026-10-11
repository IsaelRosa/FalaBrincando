import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Mascote, SettingsBar, SpeakButton } from '../../components/ui';
import { speech } from '../../lib/speech';
import { GameShell } from '../../games/GameShell';
import { GameHost } from '../../games';
import { Lembrete, ConfigLembrete } from '../../components/Lembrete';

const GAME_EMOJI: Record<string, string> = {
  pontaria: '🎯', memoria: '🃏', o_que_e: '🗣️', intruso: '🔍',
  album: '📖', vogais_silabas: '🔤', historias: '📚', instalacao: '🧩',
};
const GAME_NAME: Record<string, string> = {
  pontaria: 'Jogo da Pontaria', memoria: 'Jogo da Memória', o_que_e: 'O que é? O que é?',
  intruso: 'Encontre o Intruso', album: 'Álbum de Figuras', vogais_silabas: 'Vogais e Sílabas',
  historias: 'Histórias Falantes', instalacao: 'Instalação do Fonema',
};

/** "Minha missão de hoje" */
export function HomeResponsavel() {
  const [patients, setPatients] = useState<any[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [today, setToday] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [fala, setFala] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api<any[]>('/patients').then((p) => {
      setPatients(p);
      if (p.length) setSel(p[0].id);
    }).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!sel) return;
    api(`/sessions/today/${sel}`).then((t) => {
      setToday(t);
      setFala('Hoje você tem algumas missões. Vamos brincar?');
      setTimeout(() => speech.say('Hoje você tem algumas missões. Vamos brincar?'), 600);
    }).catch((e) => setErro(e.message));
  }, [sel]);

  if (erro) return <div className="alert error">{erro}</div>;
  if (patients.length === 0) return <p className="empty">Nenhum plano liberado para você ainda. Fale com a fonoaudióloga.</p>;

  const feitos = today?.activities?.filter((a: any) => a.done && a.done.sessoes > 0).length ?? 0;
  const total = today?.activities?.length ?? 0;

  return (
    <div className="child-shell">
      <div className="child-top">
        <div className="row">
          <Mascote size={54} mood="feliz" />
          <div>
            <strong style={{ fontSize: '1.2rem' }}>Minha missão de hoje</strong>
            <div className="muted">{patients.find((p) => p.id === sel)?.apelido ?? ''}</div>
          </div>
        </div>
        <SettingsBar />
      </div>

      <div className="container">
        {sel && <Lembrete patientId={sel} />}

        {patients.length > 1 && (
          <select value={sel ?? ''} onChange={(e) => setSel(Number(e.target.value))} style={{ maxWidth: 280, marginBottom: '1rem' }}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.apelido || p.nome}</option>)}
          </select>
        )}

        <div className="mission-card">
          <div className="mission-emoji float">🚀</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ margin: 0 }}>Você tem {Math.max(total - feitos, 0)} missões hoje</h2>
            <p className="muted" style={{ margin: 0 }}>Pode ser pouquinho. Cada tentativa conta!</p>
          </div>
          <div className="row">
            <SpeakButton text={fala} label="Ouvir" />
            <Link to="/historico" className="btn ghost">📅 Meu histórico</Link>
            <Link to={`/acompanhamento/${sel}`} className="btn ghost">📅 Calendário</Link>
          </div>
        </div>

        {total === 0 && (
          <div className="game-area center">
            <Mascote size={70} mood="pensativo" />
            <p>A fonoaudióloga ainda não liberou missões para hoje. Enquanto isso, que tal conversar?</p>
          </div>
        )}

        <div className="grid cols-2">
          {today?.activities?.map((a: any) => {
            const concluido = a.done && a.done.sessoes > 0;
            return (
              <div key={a.id} className={`game-area ${concluido ? 'tint-verde' : ''}`} style={{ marginBottom: 0 }}>
                <div className="row between">
                  <span className="pill">{a.stage_nome ?? ' exercício'}</span>
                  <span className="muted">{a.duration_min ?? '?'} min</span>
                </div>
                <h3 style={{ marginTop: '.6rem' }}>
                  {GAME_EMOJI[a.game_key] ?? '🎈'} {a.title}
                </h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {GAME_NAME[a.game_key] ?? a.game_key} · {a.frequency ?? 'sem frequência definida'}
                  {a.symbol ? ` · fonema ${a.symbol}` : ''}
                </p>
                {concluido && <span className="pill green">✓ Feita hoje ({a.done.sessoes}×)</span>}
                <div className="row" style={{ marginTop: '.8rem' }}>
                  <button className="btn lg" onClick={() => nav(`/jogo/${a.id}`)}>
                    {concluido ? 'Jogar de novo' : 'Começar'}
                  </button>
                  {a.instructions && (
                    <button className="btn ghost" onClick={() => speech.say(a.instructions)}>📌 Ouvir instruções</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card tint-amarelo">
          <div className="row">
            <Mascote size={48} />
            <p style={{ margin: 0 }}>
              💛 <strong>Sem errado aqui.</strong> Pode parar quando quiser, pedir para ouvir de novo e
              tentar várias vezes. Se algum som sair diferente do modelo, a fonoaudióloga explica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tela de execução de uma atividade. */
export function Jogar() {
  const { id } = useParams();
  const [activity, setActivity] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    api<any[]>('/patients').then(async (ps) => {
      for (const p of ps) {
        const t = await api<any>(`/sessions/today/${p.id}`);
        const a = t.activities.find((x: any) => x.id === Number(id));
        if (a) { setActivity(a); speech.say(`Vamos brincar: ${a.title}`); return; }
      }
    }).catch(() => {});
  }, [id]);

  if (!activity) return <div className="child-shell"><div className="container"><p>Carregando a missão…</p></div></div>;

  return (
    <div className="child-shell">
      <div className="child-top">
        <div className="row">
          <Mascote size={44} />
          <strong>{activity.title}</strong>
        </div>
        <div className="row">
          <SettingsBar />
          <button className="btn ghost" onClick={() => nav('/')}>← Sair</button>
        </div>
      </div>
      <div className="container">
        {activity.instructions && (
          <div className="alert info">📌 <strong>Para o responsável:</strong> {activity.instructions}</div>
        )}
        <GameShell patientId={activity.patient_id} activityId={activity.id} onExit={() => nav('/')}>
          {(ctx: any) => <GameHost activity={activity} ctx={ctx} />}
        </GameShell>
      </div>
    </div>
  );
}

/** Histórico e relatório do responsável. */
export function Historico() {
  const [patients, setPatients] = useState<any[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [rep, setRep] = useState<any>(null);

  useEffect(() => {
    api<any[]>('/patients').then((p) => { setPatients(p); if (p[0]) setSel(p[0].id); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sel) return;
    api<any[]>(`/sessions/history/${sel}`).then(setHist).catch(() => {});
    api(`/sessions/report/${sel}`).then(setRep).catch(() => {});
  }, [sel]);

  return (
    <>
      <div className="row between">
        <div className="row"><Mascote size={46} /><h1 style={{ margin: 0 }}>📅 Histórico e participação</h1></div>
        <Link to="/" className="btn">← Voltar</Link>
      </div>

      {sel && <ConfigLembrete patientId={sel} />}

      {patients.length > 1 && (
        <select value={sel ?? ''} onChange={(e) => setSel(Number(e.target.value))} style={{ maxWidth: 260, margin: '.8rem 0' }}>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.apelido || p.nome}</option>)}
        </select>
      )}

      <div className="alert info">
        Aqui mostramos <strong>quantas vezes cada atividade foi feita</strong>. Isso é frequência de
        participação — <strong>não é avaliação de progresso clínico</strong>. A evolução é avaliada pela
        fonoaudióloga.
      </div>

      <div className="card">
        <h3>Últimas atividades</h3>
        {hist.length === 0 && <p className="muted">Nenhuma atividade registrada ainda.</p>}
        <table>
          <thead><tr><th>Data</th><th>Atividade</th><th>Situação</th><th>Tentativas</th><th>Tempo</th><th>Sua observação</th></tr></thead>
          <tbody>
            {hist.map((h) => (
              <tr key={h.id}>
                <td>{h.started_at?.slice(0, 16)}</td>
                <td>{h.title}</td>
                <td>{{ concluida: '✅ Concluída', pausada: '⏸️ Pausada', interrompida: '⏹️ Interrompida', abandonada: '🚪 Abandonada' }[h.end_reason as string] ?? h.end_reason}</td>
                <td>{h.attempts}</td>
                <td>{Math.round((h.duration_sec ?? 0) / 60)} min</td>
                <td className="muted">{h.observations ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rep && rep.recompensas.length > 0 && (
        <div className="card tint-amarelo">
          <h3>🏅 Conquistas</h3>
          <div className="recompensas">{rep.recompensas.map((x: any) => <span key={x.id} className="recompensa">{x.emoji} {x.label}</span>)}</div>
        </div>
      )}

      {rep && rep.observacoes.length > 0 && (
        <div className="card">
          <h3>📝 Observações compartilhadas com a fonoaudióloga</h3>
          {rep.observacoes.map((o: any, i: number) => (
            <div key={i} style={{ borderBottom: '2px solid var(--borda)', padding: '.5rem 0' }}>
              <span className="muted">{o.started_at?.slice(0, 10)} {o.child_feedback && `· ${o.child_feedback}`}</span>
              <div>{o.observations}</div>
            </div>
          ))}
          <p className="muted">🔒 Esses registros são visíveis apenas para a fonoaudióloga autorizada.</p>
        </div>
      )}
    </>
  );
}