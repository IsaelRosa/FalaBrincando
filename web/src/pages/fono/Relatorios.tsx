import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function Relatorios() {
  const [patients, setPatients] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/patients').then(setPatients).catch(() => {}); }, []);

  return (
    <>
      <h1>📊 Relatórios</h1>
      <p className="muted">
        Os relatórios separam <strong>frequência de uso</strong>, <strong>registros do responsável</strong> e
        <strong> evolução clínica</strong> — que só você pode registrar. Nada é diagnosticado pelo sistema.
      </p>
      <div className="grid cols-3">
        {patients.map((p) => (
          <Link key={p.id} to={`/fono/relatorios/${p.id}`} className="card tint-azul" style={{ marginBottom: 0 }}>
            <strong>{p.apelido || p.nome}</strong>
            <div className="muted">Ver relatório</div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function RelatorioDetalhe() {
  const { patientId } = useParams();
  const [r, setR] = useState<any>(null);
  useEffect(() => { api(`/sessions/report/${patientId}`).then(setR).catch(() => {}); }, [patientId]);

  if (!r) return <p>Carregando…</p>;

  return (
    <>
      <div className="row between">
        <h1 style={{ margin: 0 }}>📊 {r.patient.apelido || r.patient.nome}</h1>
        <button className="btn" onClick={() => window.print()}>🖨️ Exportar / Salvar em PDF</button>
      </div>
      <p className="muted">
        Período: {r.periodo.inicio ?? '—'} a {r.periodo.fim ?? '—'}
      </p>
      <div className="alert warn">{r.aviso}</div>

      <div className="card">
        <h3>1. Frequência de uso</h3>
        <table>
          <thead><tr><th>Dia</th><th>Jogo</th><th>Fonema</th><th>Sessões</th><th>Concluídas</th><th>Tentativas</th><th>Minutos</th></tr></thead>
          <tbody>
            {r.frequencia.map((f: any, i: number) => (
              <tr key={i}>
                <td>{f.dia}</td><td>{f.game_key}</td><td>{f.symbol ?? '—'}</td>
                <td>{f.sessoes}</td><td>{f.concluidas}</td><td>{f.tentativas}</td>
                <td>{Math.round((f.segundos ?? 0) / 60)}</td>
              </tr>
            ))}
            {r.frequencia.length === 0 && <tr><td colSpan={7}>Sem sessões registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>2. Registros do responsável (não é avaliação automática)</h3>
        <table>
          <thead><tr><th>Fonema</th><th>Resultado marcado</th><th>Quantidade</th></tr></thead>
          <tbody>
            {r.desempenho.map((d: any, i: number) => (
              <tr key={i}><td>{d.symbol ?? '—'}</td><td>{d.result}</td><td>{d.n}</td></tr>
            ))}
            {r.desempenho.length === 0 && <tr><td colSpan={3}>Nenhuma tentativa marcada.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>3. Evolução clínica (decisões da fonoaudióloga)</h3>
        {r.etapas.map((e: any, i: number) => (
          <div key={i} className="row" style={{ borderBottom: '2px solid var(--borda)', padding: '.4rem 0' }}>
            <span className="pill rose">{e.symbol ?? '—'}</span>
            <strong>{e.nome ?? e.stage_key}</strong>
            <span className="pill">{e.status}</span>
            {e.fono_decision && <span className="muted">decisão: {e.fono_decision}</span>}
          </div>
        ))}
        {r.etapas.length === 0 && <p className="muted">Nenhuma etapa definida.</p>}
      </div>

      <div className="card">
        <h3>4. Observações do responsável</h3>
        {r.observacoes.length === 0 && <p className="muted">Nenhuma observação registrada.</p>}
        {r.observacoes.map((o: any, i: number) => (
          <div key={i} style={{ borderBottom: '2px solid var(--borda)', padding: '.5rem 0' }}>
            <span className="muted">{o.started_at} {o.child_feedback && `· ${o.child_feedback}`}</span>
            <div>{o.observations}</div>
          </div>
        ))}
      </div>

      {r.recompensas.length > 0 && (
        <div className="card tint-amarelo">
          <h3>5. Recompensas simbólicas</h3>
          <div className="recompensas">
            {r.recompensas.map((x: any) => <span key={x.id} className="recompensa">{x.emoji} {x.label}</span>)}
          </div>
        </div>
      )}
    </>
  );
}