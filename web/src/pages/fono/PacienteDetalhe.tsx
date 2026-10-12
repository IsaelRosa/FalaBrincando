import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Mascote } from '../../components/ui';
import { ExcluirPaciente } from './ExcluirPaciente';

interface Phoneme { id: number; symbol: string; name: string; is_global: boolean; words?: any[] }
interface Stage { id: number; stage_key: string; status: string; ordem_custom: number | null; advancement_criteria: string | null; stage_nome: string; ordem: number; cor: string; symbol: string; fono_decision: string | null }

export function PacienteDetalhe() {
  const { id } = useParams();
  const patientId = Number(id);
  const [data, setData] = useState<any>(null);
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [excluir, setExcluir] = useState(false);
  const [erro, setErro] = useState('');

  const load = () => api(`/patients/${patientId}`).then(setData).catch((e) => setErro(e.message));
  useEffect(() => {
    load();
    api<Phoneme[]>('/phonemes').then(setPhonemes).catch(() => {});
    api<any>('/catalog').then(setCatalog).catch(() => {});
  }, [patientId]);

  const stages = useMemo(() => data?.stages ?? [], [data]);
  const byPhoneme = useMemo(() => {
    const m = new Map<string, Stage[]>();
    stages.forEach((s: Stage) => {
      if (!m.has(s.symbol)) m.set(s.symbol, []);
      m.get(s.symbol)!.push(s);
    });
    return m;
  }, [stages]);

  const refresh = async () => { await load(); setMsg('Salvo.'); setTimeout(() => setMsg(''), 1800); };

  if (erro) return <div className="alert error">{erro}</div>;
  if (!data) return <p>Carregando…</p>;

  return (
    <>
      <div className="row between">
        <div className="row">
          <Mascote size={48} />
          <div>
            <h1 style={{ margin: 0 }}>{data.patient.avatar ?? '🦜'} {data.patient.apelido || data.patient.nome}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {data.patient.nome} · <Link to="/fono/pacientes">voltar</Link>
            </p>
          </div>
        </div>
        <div className="row">
          <Link className="btn ghost" to={`/fono/pacientes/${patientId}/perfil`}>👶 Perfil</Link>
          <Link className="btn ghost" to={`/fono/pacientes/${patientId}/perfil`}>👶 Perfil</Link>
          <Link className="btn ghost" to={`/fono/acompanhamento/${patientId}`}>📈 Acompanhamento</Link>
          <Link className="btn ghost" to={`/fono/gravacoes/${patientId}`}>🎙️ Gravações</Link>
          <Link className="btn ghost" to={`/fono/responsaveis/${patientId}`}>👪 Responsáveis</Link>
          <button className="btn ghost" style={{ color: '#96263c', borderColor: '#ffc2cc' }}
            onClick={() => setExcluir(true)}>🗑️</button>
          <Link className="btn ghost" to={`/fono/relatorios/${patientId}`}>📊 Relatório</Link>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}
      {erro && <div className="alert error">{erro}</div>}

      <div className="alert info">
        A trilha abaixo mostra apenas as etapas que <strong>você selecionou</strong>. A ordem e as
        decisões são individuais — nem toda criança percorre todas as etapas na mesma ordem.
      </div>

      <div className="card">
        <h3>🪜 Trilha da articulação</h3>
        {byPhoneme.size === 0 && <p className="muted">Nenhuma etapa definida ainda.</p>}
        {[...byPhoneme.entries()].map(([sym, list]) => (
          <div key={sym} style={{ marginBottom: '1.5rem' }}>
            <div className="row" style={{ marginBottom: '.5rem' }}>
              <span className="pill rose">Fonema {sym}</span>
            </div>
            <div className="trilha">
              {list.map((s) => (
                <div key={s.id} className="trilho-step" data-status={s.status} style={{ background: s.cor || '#7b5ea7' }}>
                  <div className="num">{s.ordem_custom ?? s.ordem}</div>
                  <h4>{s.stage_nome}</h4>
                  <div style={{ marginTop: '.5rem' }}>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ margin: '0 0 .6rem' }}>Decidir etapas</h4>
              {list.map((s) => (
                <div key={s.id} className="row" style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '2px solid var(--borda)' }}>
                  <strong style={{ minWidth: 170 }}>{s.stage_nome}</strong>
                  <select
                    value={s.status}
                    onChange={async (e) => {
                      await api(`/patients/${patientId}/stages/${s.id}`, { method: 'PATCH', body: { status: e.target.value, fono_decision: e.target.value } });
                      refresh();
                    }}
                  >
                    <option value="pausada">Pausada</option>
                    <option value="ativa">Ativa</option>
                    <option value="retomar">Retomar</option>
                    <option value="concluida">Concluída</option>
                  </select>
                  <input
                    style={{ flex: 1, minWidth: 220 }}
                    placeholder="Critério clínico para avançar"
                    defaultValue={s.advancement_criteria ?? ''}
                    onBlur={async (e) => {
                      await api(`/patients/${patientId}/stages/${s.id}`, { method: 'PATCH', body: { advancement_criteria: e.target.value } });
                      refresh();
                    }}
                  />
                  <button
                    className="btn small ghost"
                    onClick={async () => {
                      const dec = prompt('Decisão clínica desta etapa: avançar, manter ou retomar?', s.fono_decision ?? 'manter');
                      if (dec === null) return;
                      await api(`/patients/${patientId}/stages/${s.id}`, { method: 'PATCH', body: { fono_decision: dec } });
                      refresh();
                    }}
                  >Decidir</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <AddStageForm patientId={patientId} phonemes={phonemes} stages={catalog?.stages ?? []} onSaved={refresh} />
      </div>

      <div className="card">
        <div className="row between">
          <h3>🎯 Atividades prescritas</h3>
          <span className="pill">{data.activities.length} ativas</span>
        </div>
        {data.activities.length === 0 && <p className="muted">Nenhuma atividade. Adicione abaixo.</p>}
        {data.activities.map((a: any) => (
          <div key={a.id} className="card tint-amarelo" style={{ marginBottom: '.7rem' }}>
            <div className="row between">
              <div>
                <strong>{a.title}</strong>
                <div className="muted">
                  {a.game_nome} · {a.symbol ? `fonema ${a.symbol}` : 'sem fonema'} · {a.stage_nome ?? 'sem etapa'} ·{' '}
                  {a.frequency ?? 'sem frequência'} · {a.duration_min ?? '?'} min
                </div>
              </div>
              <div className="row">
                <button className="btn ghost small" onClick={async () => {
                  await api(`/patients/${patientId}/activities/${a.id}`, { method: 'PATCH', body: { active: 0 } });
                  refresh();
                }}>Desativar</button>
                <button className="btn ghost small" onClick={async () => {
                  await api(`/patients/${patientId}/activities/${a.id}/clone`, { method: 'POST' });
                  refresh();
                }}>Duplicar</button>
              </div>
            </div>
            {a.instructions && <p style={{ margin: '.5rem 0 0' }}>📌 {a.instructions}</p>}
            <details style={{ marginTop: '.5rem' }}>
              <summary className="muted" style={{ cursor: 'pointer' }}>Configuração</summary>
              <pre style={{ background: '#fff', padding: '.7rem', borderRadius: 12, overflowX: 'auto', fontSize: '.85rem' }}>
                {JSON.stringify(safeParse(a.config), null, 2)}
              </pre>
            </details>
          </div>
        ))}
        <AddActivityForm patientId={patientId} phonemes={phonemes} catalog={catalog} onSaved={refresh} />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>🔗 Responsáveis</h3>
          <p className="muted">Vincule o e-mail de um responsável que já criou conta.</p>
          <input placeholder="responsavel@exemplo.com" id="gmail" type="email" />
          <button className="btn" style={{ marginTop: '.6rem' }}
            onClick={async () => {
              const email = (document.getElementById('gmail') as HTMLInputElement).value;
              try {
                await api(`/patients/${patientId}/guardians`, { method: 'POST', body: { email, relation: 'Responsável' } });
                alert('Responsável vinculado.');
              } catch (err: any) { alert(err.message); }
            }}>Vincular</button>
        </div>

        <div className="card">
          <h3>📝 Observações clínicas</h3>
          <textarea placeholder="Registre sua evolução aqui…" id="nota" />
          <button className="btn" style={{ marginTop: '.6rem' }}
            onClick={async () => {
              const body = (document.getElementById('nota') as HTMLTextAreaElement).value;
              if (!body) return;
              await api(`/patients/${patientId}/notes`, { method: 'POST', body: { body } });
              (document.getElementById('nota') as HTMLTextAreaElement).value = '';
              alert('Observação registrada.');
            }}>Registrar</button>
        </div>
      </div>

      {excluir && (
        <ExcluirPaciente
          patient={data.patient}
          onFim={() => setExcluir(false)}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ativa: ['🟢 Ativa', 'green'],
    pausada: ['⏸️ Pausada', ''],
    concluida: ['✅ Concluída', 'green'],
    retomar: ['🔄 Retomar', 'sun'],
  };
  const [label, cls] = map[status] ?? [status, ''];
  return <span className={`pill ${cls}`}>{label}</span>;
}

function AddStageForm({ patientId, phonemes, stages, onSaved }: any) {
  const [ph, setPh] = useState('');
  const [st, setSt] = useState('');
  const [crit, setCrit] = useState('');
  return (
    <div className="card tint-lilas" style={{ marginBottom: 0 }}>
      <h4 style={{ marginTop: 0 }}>➕ Adicionar etapa ao plano</h4>
      <div className="row">
        <select value={ph} onChange={(e) => setPh(e.target.value)}>
          <option value="">Fonema…</option>
          {phonemes.map((p: Phoneme) => (
            <option key={p.id} value={p.id}>{p.symbol} {p.is_global ? '(modelo global)' : ''}</option>
          ))}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Etapa…</option>
          {stages.map((s: any) => (
            <option key={s.key} value={s.key}>{s.ordem}. {s.nome}</option>
          ))}
        </select>
        <input placeholder="Critério clínico (opcional)" value={crit} onChange={(e) => setCrit(e.target.value)} />
        <button className="btn" disabled={!ph || !st}
          onClick={async () => {
            await api(`/patients/${patientId}/stages`, {
              method: 'POST',
              body: { phoneme_id: Number(ph), stage_key: st, advancement_criteria: crit || null },
            });
            onSaved();
          }}>Adicionar</button>
      </div>
    </div>
  );
}

function AddActivityForm({ patientId, phonemes, catalog, onSaved }: any) {
  const [game, setGame] = useState('');
  const [title, setTitle] = useState('');
  const [ph, setPh] = useState('');
  const [stage, setStage] = useState('');
  const [freq, setFreq] = useState('Diária');
  const [dur, setDur] = useState('10');
  const [instr, setInstr] = useState('');
  const [cfg, setCfg] = useState('{}');

  return (
    <div className="card tint-verde" style={{ marginBottom: 0 }}>
      <h4 style={{ marginTop: 0 }}>➕ Nova atividade</h4>
      <div className="grid cols-3">
        <div className="field">
          <label>Jogo</label>
          <select value={game} onChange={(e) => { setGame(e.target.value); setTitle((catalog?.games ?? []).find((g: any) => g.key === e.target.value)?.nome ?? ''); }}>
            <option value="">Selecione…</option>
            {(catalog?.games ?? []).map((g: any) => <option key={g.key} value={g.key}>{g.nome}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Fonema</label>
          <select value={ph} onChange={(e) => setPh(e.target.value)}>
            <option value="">—</option>
            {phonemes.map((p: Phoneme) => <option key={p.id} value={p.id}>{p.symbol}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Etapa</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">—</option>
            {(catalog?.stages ?? []).map((s: any) => <option key={s.key} value={s.key}>{s.nome}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Frequência</label>
          <input value={freq} onChange={(e) => setFreq(e.target.value)} />
        </div>
        <div className="field">
          <label>Duração (min)</label>
          <input type="number" value={dur} onChange={(e) => setDur(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Instruções para o responsável</label>
        <input value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="Ex.: Sente-se ao lado e repita a palavra 10 vezes." />
      </div>
      <div className="field">
        <label>Configuração do jogo (JSON)</label>
        <textarea value={cfg} onChange={(e) => setCfg(e.target.value)} style={{ minHeight: 90, fontFamily: 'monospace' }}
          placeholder='{"attempts":10,"cards":["sol","sapo"]}' />
        <span className="hint">Ex.: pontaria → attempts, cards · memória → pairs · o que é → questions · instalação → sequence</span>
      </div>
      <button className="btn" disabled={!game || !title}
        onClick={async () => {
          let parsed: any = {};
          try { parsed = JSON.parse(cfg); } catch { alert('JSON inválido na configuração.'); return; }
          await api(`/patients/${patientId}/activities`, {
            method: 'POST',
            body: {
              game_key: game, title, phoneme_id: ph ? Number(ph) : null, stage_key: stage || null,
              frequency: freq, duration_min: Number(dur), instructions: instr || null, config: parsed,
            },
          });
          onSaved();
        }}>Adicionar atividade</button>
    </div>
  );
}

function safeParse(v: any) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
}